/// <reference types="vite/client" />

declare module '*.svg' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}

declare module '*.svg?component' {
  import { Component } from 'vue';
  const component: Component;
  export default component;
}
