#!/usr/bin/env node

/**
 * build.js
 *
 *   node build.js           -> builds both gh + offline
 *   node build.js gh        -> GitHub Pages only
 *   node build.js offline   -> offline only (+ Caddy)
 */

import { execSync } from 'node:child_process'
import {
	existsSync, mkdirSync, writeFileSync,
	unlinkSync, chmodSync, readFileSync,
} from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { gunzipSync, inflateRawSync } from 'node:zlib'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MODES = {
	gh: {
		outDir: 'dist/gh',
		buildCmd: 'vite build --mode gh-pages --outDir dist/gh',
	},
	offline: {
		outDir: 'dist/offline',
		buildCmd: 'vite build --mode offline --outDir dist/offline',
	},
}

const CADDY_VERSION = '2.9.1'
const CADDY_API_URL = `https://api.github.com/repos/caddyserver/caddy/releases/tags/v${CADDY_VERSION}`
const OFFLINE_PORT  = 8080

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg, type = 'info') {
	const prefix = { info: '->', success: 'OK', warn: '!!', error: 'XX' }[type] ?? '..'
	console.log(`  [${prefix}] ${msg}`)
}

function run(cmd, label) {
	log(label ?? cmd)
	execSync(cmd, { stdio: 'inherit' })
}

function detectPlatform() {
	const p = process.platform
	const a = process.arch
	if (p === 'win32') return { os: 'windows', arch: a === 'x64' ? 'amd64' : 'arm64', ext: '.exe' }
	if (p === 'darwin') return { os: 'darwin',  arch: a === 'arm64' ? 'arm64' : 'amd64', ext: '' }
	return               { os: 'linux',   arch: a === 'arm64' ? 'arm64' : 'amd64', ext: '' }
}

// ---------------------------------------------------------------------------
// Network — buffers the entire response into memory (handles all redirects)
// ---------------------------------------------------------------------------

async function fetchJson(url) {
	return JSON.parse(await fetchBuffer(url).then(b => b.toString('utf8')))
}

/**
 * Download `url` into a Buffer, following up to 10 redirects.
 * Progress is printed every ~10 % of the expected file size.
 */
async function fetchBuffer(url, _redirects = 0) {
	if (_redirects > 10) throw new Error('Too many redirects')

	return new Promise((resolve, reject) => {
		https.get(url, { headers: { 'User-Agent': 'build.js' } }, (res) => {
			// Follow redirects
			if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
				res.resume() // drain so the socket is reused
				resolve(fetchBuffer(res.headers.location, _redirects + 1))
				return
			}

			if (res.statusCode !== 200) {
				res.resume()
				reject(new Error(`HTTP ${res.statusCode} for ${url}`))
				return
			}

			const totalBytes = parseInt(res.headers['content-length'] ?? '0', 10)
			const chunks = []
			let received = 0
			let lastPct  = 0

			res.on('data', (chunk) => {
				chunks.push(chunk)
				received += chunk.length
				if (totalBytes > 0) {
					const pct = Math.floor((received / totalBytes) * 100)
					if (pct >= lastPct + 10) {
						lastPct = pct - (pct % 10)
						process.stdout.write(`\r  [->]   ${lastPct}%  (${(received / 1024 / 1024).toFixed(1)} / ${(totalBytes / 1024 / 1024).toFixed(1)} MB)`)
					}
				}
			})

			res.on('end', () => {
				if (totalBytes > 0) process.stdout.write('\n')
				resolve(Buffer.concat(chunks))
			})

			res.on('error', reject)
		}).on('error', reject)
	})
}

// ---------------------------------------------------------------------------
// Minimal tar.gz extractor (pure Node builtins)
// ---------------------------------------------------------------------------

function extractFileFromTarGz(tarGzBuf, targetBaseName, destPath) {
	const tar = gunzipSync(tarGzBuf)
	let off = 0

	while (off + 512 <= tar.length) {
		const hdr = tar.subarray(off, off + 512)

		const nameEnd = hdr.indexOf(0)
		const name    = hdr.subarray(0, nameEnd < 0 ? 100 : Math.min(nameEnd, 100)).toString('utf8')
		const size    = parseInt(hdr.subarray(124, 136).toString('utf8').replace(/\0/g, '').trim(), 8) || 0

		if (!name && size === 0) break // two empty blocks = EOF

		off += 512 // past header

		if (path.basename(name) === targetBaseName && size > 0) {
			writeFileSync(destPath, tar.subarray(off, off + size))
			return true
		}

		off += Math.ceil(size / 512) * 512
	}

	return false
}

// ---------------------------------------------------------------------------
// Minimal ZIP extractor (pure Node builtins, no external deps)
//
// ZIP End-of-Central-Directory (EOCD) is at the end of the file.
// We scan for the EOCD signature, read the central directory, find our file,
// then decompress the local entry with Node's built-in zlib.
// ---------------------------------------------------------------------------

function extractFileFromZip(zipBuf, targetBaseName, destPath) {
	// --- find EOCD (End of Central Directory) ---
	// Signature: 0x06054b50  (little-endian: 50 4b 05 06)
	const EOCD_SIG = 0x06054b50
	let eocdOff = -1
	for (let i = zipBuf.length - 22; i >= 0; i--) {
		if (zipBuf.readUInt32LE(i) === EOCD_SIG) { eocdOff = i; break }
	}
	if (eocdOff < 0) throw new Error('ZIP: cannot find End-of-Central-Directory record')

	const cdOffset = zipBuf.readUInt32LE(eocdOff + 16) // offset of start of central directory
	const cdSize   = zipBuf.readUInt32LE(eocdOff + 12) // size of central directory
	const totalEntries = zipBuf.readUInt16LE(eocdOff + 10)

	// --- walk Central Directory ---
	const CD_SIG = 0x02014b50
	let cdOff = cdOffset

	for (let i = 0; i < totalEntries; i++) {
		if (zipBuf.readUInt32LE(cdOff) !== CD_SIG) break

		const comprMethod  = zipBuf.readUInt16LE(cdOff + 10)
		const compressedSz = zipBuf.readUInt32LE(cdOff + 20)
		const uncompSz     = zipBuf.readUInt32LE(cdOff + 24)
		const fnLen        = zipBuf.readUInt16LE(cdOff + 28)
		const extraLen     = zipBuf.readUInt16LE(cdOff + 30)
		const commentLen   = zipBuf.readUInt16LE(cdOff + 32)
		const localHdrOff  = zipBuf.readUInt32LE(cdOff + 42)
		const name         = zipBuf.subarray(cdOff + 46, cdOff + 46 + fnLen).toString('utf8')

		cdOff += 46 + fnLen + extraLen + commentLen

		if (path.basename(name) !== targetBaseName) continue

		// --- read Local File Header to find actual data offset ---
		const LFH_SIG = 0x04034b50
		if (zipBuf.readUInt32LE(localHdrOff) !== LFH_SIG) throw new Error('ZIP: bad local file header')

		const lfhFnLen    = zipBuf.readUInt16LE(localHdrOff + 26)
		const lfhExtraLen = zipBuf.readUInt16LE(localHdrOff + 28)
		const dataOff     = localHdrOff + 30 + lfhFnLen + lfhExtraLen

		const compressed = zipBuf.subarray(dataOff, dataOff + compressedSz)

		let data
		if (comprMethod === 0) {
			// Stored (no compression)
			data = compressed
		} else if (comprMethod === 8) {
			// Deflated
			data = inflateRawSync(compressed)
		} else {
			throw new Error(`ZIP: unsupported compression method ${comprMethod}`)
		}

		writeFileSync(destPath, data)
		return true
	}

	return false
}

// ---------------------------------------------------------------------------
// Caddy download
// ---------------------------------------------------------------------------

async function downloadCaddy(outDir) {
	const { os, arch, ext } = detectPlatform()
	const binName = `caddy${ext}`
	const binDest = path.join(outDir, binName)

	if (existsSync(binDest)) {
		log(`${binName} already exists — skipping download`, 'warn')
		return
	}

	log(`Fetching Caddy v${CADDY_VERSION} release metadata...`)
	const release = await fetchJson(CADDY_API_URL)
	if (release.message) throw new Error(`GitHub API error: ${release.message}`)

	const isWin     = os === 'windows'
	const assetName = isWin
		? `caddy_${CADDY_VERSION}_${os}_${arch}.zip`
		: `caddy_${CADDY_VERSION}_${os}_${arch}.tar.gz`

	const asset = release.assets?.find((a) => a.name === assetName)
	if (!asset) {
		const names = (release.assets ?? []).map((a) => a.name).join('\n    ')
		throw new Error(`Asset "${assetName}" not found.\nAvailable:\n    ${names}`)
	}

	log(`Downloading ${asset.name} (${(asset.size / 1024 / 1024).toFixed(1)} MB)...`)

	// Download entirely into memory — avoids stream/pipe issues on Windows
	const buf = await fetchBuffer(asset.browser_download_url)
	log(`Downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MB, extracting ${binName}...`)

	let found = false

	if (isWin) {
		// Try pure-JS ZIP extraction first (no PowerShell dependency)
		try {
			found = await extractFileFromZip(buf, binName, binDest)
		} catch (e) {
			log(`Pure-JS ZIP failed (${e.message}), falling back to PowerShell...`, 'warn')
			// PowerShell fallback: write zip to disk, extract, clean up
			const tmp = path.join(outDir, '_caddy_tmp.zip')
			writeFileSync(tmp, buf)
			try {
				execSync(
					`powershell -NoProfile -Command "Expand-Archive -Path '${tmp}' -DestinationPath '${outDir}' -Force"`,
					{ stdio: 'inherit' }
				)
				found = existsSync(binDest)
			} finally {
				try { unlinkSync(tmp) } catch {}
			}
		}
	} else {
		found = extractFileFromTarGz(buf, binName, binDest)
	}

	if (!found || !existsSync(binDest)) throw new Error(`${binName} missing after extraction in ${outDir}`)

	try { chmodSync(binDest, 0o755) } catch {}
	log(`${binName} ready`, 'success')
}

// ---------------------------------------------------------------------------
// Caddyfile
// ---------------------------------------------------------------------------

function writeCaddyfile(outDir) {
	const lines = [
		`# Caddyfile - generated by build.js`,
		`# Run:  caddy.exe run   (Windows)`,
		`#       ./caddy run     (macOS / Linux)`,
		``,
		`:${OFFLINE_PORT} {`,
		`\troot * .`,
		`\tfile_server`,
		``,
		`\t# SPA fallback - unknown paths -> index.html`,
		`\ttry_files {path} /index.html`,
		``,
		`\tlog {`,
		`\t\toutput discard`,
		`\t}`,
		`}`,
		``,
	]
	writeFileSync(path.join(outDir, 'Caddyfile'), lines.join('\n'), 'utf8')
	log(`Caddyfile written (port ${OFFLINE_PORT})`, 'success')
}

// ---------------------------------------------------------------------------
// User-facing helper files
// ---------------------------------------------------------------------------

function writeHelpers(outDir) {
	const url = `http://localhost:${OFFLINE_PORT}`

	writeFileSync(path.join(outDir, 'README.txt'), [
		`Offline build`,
		``,
		`Windows`,
		`  Double-click start.bat`,
		`  Or in terminal: caddy.exe run`,
		`  Then open: ${url}`,
		``,
		`macOS / Linux`,
		`  ./start.sh`,
		`  Or: ./caddy run`,
		`  Then open: ${url}`,
		``,
	].join('\n'), 'utf8')

	writeFileSync(path.join(outDir, 'start.bat'), [
		`@echo off`,
		`echo Starting server on ${url}`,
		`start ${url}`,
		`caddy.exe run`,
		`pause`,
		``,
	].join('\r\n'), 'utf8')

	const sh = [
		`#!/bin/sh`,
		`echo "Starting server on ${url}"`,
		`open "${url}" 2>/dev/null || xdg-open "${url}" 2>/dev/null || true`,
		`./caddy run`,
		``,
	].join('\n')
	writeFileSync(path.join(outDir, 'start.sh'), sh, 'utf8')
	try { chmodSync(path.join(outDir, 'start.sh'), 0o755) } catch {}

	log('README.txt + start.bat + start.sh written', 'success')
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

async function buildMode(mode) {
	const cfg = MODES[mode]
	if (!cfg) throw new Error(`Unknown mode "${mode}". Use "gh" or "offline".`)

	console.log(`\n${'='.repeat(52)}`)
	console.log(`  ${mode.toUpperCase()}  ->  ${cfg.outDir}`)
	console.log(`${'='.repeat(52)}`)

	mkdirSync(cfg.outDir, { recursive: true })

	run('vue-tsc --build', 'Type check')
	run(cfg.buildCmd, `Vite build -> ${cfg.outDir}`)

	if (mode === 'offline') {
		console.log()
		log('Preparing Caddy...')
		writeCaddyfile(cfg.outDir)
		await downloadCaddy(cfg.outDir)
		writeHelpers(cfg.outDir)
	}

	log(`"${mode}" build complete -> ${cfg.outDir}`, 'success')
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
	const arg = process.argv[2]
	try {
		if (arg === 'gh' || arg === 'offline') {
			await buildMode(arg)
		} else if (arg === undefined) {
			await buildMode('gh')
			await buildMode('offline')
		} else {
			throw new Error(`Unknown argument "${arg}". Use "gh", "offline", or omit for both.`)
		}
		console.log(`\n  All done!\n`)
	} catch (err) {
		console.error(`\n  Build failed:`, err.message)
		process.exit(1)
	}
}

main()
