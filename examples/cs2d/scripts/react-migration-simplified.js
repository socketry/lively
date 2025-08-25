#!/usr/bin/env node

/**
 * Simplified Vue to React Migration
 * Converts Vue 3 components to React components with TypeScript
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VueToReactConverter {
  constructor() {
    this.frontendPath = path.join(__dirname, '../frontend');
    this.srcPath = path.join(this.frontendPath, 'src');
  }

  /**
   * Convert Vue template to JSX
   */
  convertTemplateToJSX(template) {
    return template
      // Convert v-if to conditional rendering
      .replace(/v-if="([^"]*)"/g, '{$1 && (')
      .replace(/v-else-if="([^"]*)"/g, ')} {$1 && (') 
      .replace(/v-else/g, ')} {(')
      
      // Convert v-for to map
      .replace(/v-for="(\w+) in (\w+)"/g, '{$2.map(($1, index) => (')
      .replace(/v-for="(\w+), (\w+) in (\w+)"/g, '{$3.map(($1, $2) => (')
      .replace(/:key="([^"]*)"/g, 'key={$1}')
      
      // Convert Vue directives to React props
      .replace(/v-model="([^"]*)"/g, 'value={$1} onChange={(e) => set${this.capitalize("$1")}(e.target.value)}')
      .replace(/@click="([^"]*)"/g, 'onClick={$1}')
      .replace(/@submit\.prevent="([^"]*)"/g, 'onSubmit={(e) => { e.preventDefault(); $1(e); }}')
      .replace(/@(\w+)="([^"]*)"/g, 'on${this.capitalize("$1")}={$2}')
      
      // Convert interpolation
      .replace(/\{\{\s*([^}]+)\s*\}\}/g, '{$1}')
      
      // Convert class binding
      .replace(/:class="([^"]*)"/g, 'className={$1}')
      .replace(/class="([^"]*)"/g, 'className="$1"')
      
      // Convert style binding  
      .replace(/:style="([^"]*)"/g, 'style={$1}')
      
      // Convert v-show to style
      .replace(/v-show="([^"]*)"/g, 'style={{ display: $1 ? "block" : "none" }}')
      
      // Close conditional rendering blocks
      .replace(/<\/(\w+)>(\s*(?:<\/?\w|$))/g, '</$1>)}$2');
  }

  /**
   * Convert Vue script to React hooks
   */
  convertVueScriptToReact(script) {
    let reactScript = script
      // Convert Vue imports to React
      .replace(/import \{ ([^}]+) \} from 'vue'/g, (match, imports) => {
        const reactImports = imports
          .split(',')
          .map(imp => imp.trim())
          .filter(imp => ['useState', 'useEffect', 'useMemo', 'useCallback'].includes(imp))
          .join(', ');
        return reactImports ? `import { ${reactImports} } from 'react'` : '';
      })
      .replace(/import \{ useRouter \} from 'vue-router'/g, 'import { useNavigate } from "react-router-dom"')
      .replace(/import \{ storeToRefs \} from 'pinia'/g, '')
      
      // Convert Pinia stores to custom hooks
      .replace(/const (\w+Store) = use(\w+)Store\(\)/g, 'const $1 = use$2()')
      .replace(/const \{ ([^}]+) \} = storeToRefs\([^)]+\)/g, '// TODO: Convert storeToRefs')
      
      // Convert refs to useState
      .replace(/const (\w+) = ref\(([^)]*)\)/g, 'const [$1, set${this.capitalize("$1")}] = useState($2)')
      
      // Convert computed to useMemo
      .replace(/const (\w+) = computed\(\(\) => \{([^}]+)\}\)/g, 'const $1 = useMemo(() => {$2}, [])')
      .replace(/const (\w+) = computed\(\(\) => ([^)]+)\)/g, 'const $1 = useMemo(() => $2, [])')
      
      // Convert reactive to useState with object
      .replace(/const (\w+) = reactive\(([^)]*)\)/g, 'const [$1, set${this.capitalize("$1")}] = useState($2)')
      
      // Convert Vue Router
      .replace(/const router = useRouter\(\)/g, 'const navigate = useNavigate()')
      .replace(/router\.push\(/g, 'navigate(')
      
      // Convert lifecycle hooks
      .replace(/onMounted\(\(\) => \{([^}]+)\}\)/g, 'useEffect(() => {$1}, [])')
      .replace(/onMounted\(([^)]+)\)/g, 'useEffect($1, [])')
      .replace(/onUnmounted\(\(\) => \{([^}]+)\}\)/g, 'useEffect(() => { return () => {$1}; }, [])')
      .replace(/onUnmounted\(([^)]+)\)/g, 'useEffect(() => { return $1; }, [])')
      
      // Convert watch to useEffect
      .replace(/watch\(([^,]+),\s*([^)]+)\)/g, 'useEffect($2, [$1])')
      
      // Convert defineProps and defineEmits
      .replace(/const props = defineProps<([^>]+)>\(\)/g, '// Props: $1')
      .replace(/const emit = defineEmits\(\[([^\]]+)\]\)/g, '// Emits: $1');

    return reactScript;
  }

  /**
   * Convert Vue component to React component
   */
  async convertVueComponent(vueFilePath) {
    try {
      const vueContent = await fs.readFile(vueFilePath, 'utf8');
      
      // Extract Vue component parts
      const templateMatch = vueContent.match(/<template[^>]*>([\s\S]*?)<\/template>/);
      const scriptMatch = vueContent.match(/<script setup lang="ts"[^>]*>([\s\S]*?)<\/script>/);
      const styleMatch = vueContent.match(/<style[^>]*>([\s\S]*?)<\/style>/);

      const template = templateMatch ? templateMatch[1].trim() : '';
      const script = scriptMatch ? scriptMatch[1].trim() : '';
      const styles = styleMatch ? styleMatch[1].trim() : '';

      // Convert parts
      const jsx = this.convertTemplateToJSX(template);
      const reactScript = this.convertVueScriptToReact(script);
      
      const componentName = path.basename(vueFilePath, '.vue');
      
      // Extract imports and separate them
      const importLines = reactScript.split('\n').filter(line => line.trim().startsWith('import'));
      const reactLogic = reactScript.split('\n').filter(line => !line.trim().startsWith('import')).join('\n');

      const reactComponent = `import React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
${importLines.join('\n')}
import styles from './${componentName}.module.css';

interface ${componentName}Props {
  // TODO: Define props from Vue component
}

export const ${componentName}: React.FC<${componentName}Props> = (props) => {
  const navigate = useNavigate();
  
  ${reactLogic}

  return (
    <div className={styles.container}>
      ${jsx}
    </div>
  );
};

export default ${componentName};`;

      // Convert styles to CSS modules
      const cssModules = this.convertStylesToCSS(styles, componentName);

      return {
        tsx: reactComponent,
        css: cssModules,
        componentName
      };
    } catch (error) {
      console.error(`Error converting ${vueFilePath}:`, error.message);
      return null;
    }
  }

  /**
   * Convert styles to CSS modules
   */
  convertStylesToCSS(styles, componentName) {
    return styles
      // Convert scoped styles to CSS modules
      .replace(/\.([a-zA-Z][a-zA-Z0-9-]*)/g, '.$1')
      .replace(/&\./g, '.')
      
      // Convert SCSS variables to CSS custom properties
      .replace(/\$color-(\w+)/g, 'var(--color-$1)')
      .replace(/\$font-(\w+)/g, 'var(--font-$1)')
      .replace(/\$cs-(\w+)/g, 'var(--cs-$1)')
      
      // Add container class
      .replace(/^/, `.container {\n  /* ${componentName} styles */\n}\n\n`);
  }

  /**
   * Convert Pinia store to React Context
   */
  async convertPiniaStore(storeFilePath) {
    try {
      const storeContent = await fs.readFile(storeFilePath, 'utf8');
      const storeName = path.basename(storeFilePath, '.ts');
      
      // Extract store definition
      const storeMatch = storeContent.match(/export const use(\w+)Store = defineStore\('(\w+)',\s*\{([\s\S]*)\}\)/);
      if (!storeMatch) return null;

      const [, capitalizedName, name, storeBody] = storeMatch;
      
      // Extract state and actions
      const stateMatch = storeBody.match(/state:\s*\(\)\s*=>\s*\(([\s\S]*?)\),/);
      const actionsMatch = storeBody.match(/actions:\s*\{([\s\S]*)\}/);

      const initialState = stateMatch ? stateMatch[1].trim() : '{}';
      const actions = actionsMatch ? actionsMatch[1].trim() : '';

      const contextCode = `import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
interface ${capitalizedName}State ${initialState}

interface ${capitalizedName}ContextType {
  state: ${capitalizedName}State;
  dispatch: React.Dispatch<any>;
}

// Context
const ${capitalizedName}Context = createContext<${capitalizedName}ContextType | undefined>(undefined);

// Reducer
function ${name}Reducer(state: ${capitalizedName}State, action: any): ${capitalizedName}State {
  switch (action.type) {
    case 'UPDATE_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Provider
export const ${capitalizedName}Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(${name}Reducer, ${initialState});

  return (
    <${capitalizedName}Context.Provider value={{ state, dispatch }}>
      {children}
    </${capitalizedName}Context.Provider>
  );
};

// Hook
export const use${capitalizedName} = (): ${capitalizedName}ContextType => {
  const context = useContext(${capitalizedName}Context);
  if (!context) {
    throw new Error('use${capitalizedName} must be used within ${capitalizedName}Provider');
  }
  return context;
};`;

      return {
        code: contextCode,
        contextName: `${capitalizedName}Context`,
        hookName: `use${capitalizedName}`
      };
    } catch (error) {
      console.error(`Error converting store ${storeFilePath}:`, error.message);
      return null;
    }
  }

  /**
   * Update package.json for React
   */
  async updatePackageJson() {
    const packageJsonPath = path.join(this.frontendPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    // Remove Vue dependencies
    const { vue, 'vue-router': vueRouter, pinia, '@vitejs/plugin-vue': vitePluginVue, ...restDeps } = packageJson.dependencies || {};
    const { 
      '@vue/eslint-config-typescript': vueEslintTS,
      '@vue/eslint-config-prettier': vueEslintPrettier,
      '@vue/test-utils': vueTestUtils,
      '@vue/tsconfig': vueTsconfig,
      'eslint-plugin-vue': eslintVue,
      'vue-tsc': vueTsc,
      ...restDevDeps 
    } = packageJson.devDependencies || {};

    // Add React dependencies
    const newPackageJson = {
      ...packageJson,
      dependencies: {
        ...restDeps,
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "react-router-dom": "^6.8.0"
      },
      devDependencies: {
        ...restDevDeps,
        "@types/react": "^18.0.26",
        "@types/react-dom": "^18.0.9",
        "@vitejs/plugin-react": "^3.1.0",
        "eslint-plugin-react": "^7.32.0",
        "eslint-plugin-react-hooks": "^4.6.0"
      }
    };

    await fs.writeFile(packageJsonPath, JSON.stringify(newPackageJson, null, 2));
    console.log('✅ Updated package.json for React');
    return newPackageJson;
  }

  /**
   * Update Vite config for React
   */
  async updateViteConfig() {
    const viteConfigPath = path.join(this.frontendPath, 'vite.config.ts');
    
    const reactViteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:9294',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:9292',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});`;

    await fs.writeFile(viteConfigPath, reactViteConfig);
    console.log('✅ Updated vite.config.ts for React');
    return reactViteConfig;
  }

  /**
   * Find all Vue files
   */
  async findVueFiles(dir) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.findVueFiles(fullPath));
      } else if (entry.name.endsWith('.vue')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Find all store files
   */
  async findStoreFiles() {
    const storesPath = path.join(this.srcPath, 'stores');
    try {
      const files = await fs.readdir(storesPath);
      return files
        .filter(file => file.endsWith('.ts') && file !== 'index.ts')
        .map(file => path.join(storesPath, file));
    } catch (error) {
      console.log('No stores directory found');
      return [];
    }
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Execute the complete migration
   */
  async migrate() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                  Vue to React Migration                   ║
║            Thinking Harder - Simplified Approach         ║
╚════════════════════════════════════════════════════════════╝

🚀 Converting Vue 3 → React 18
📦 Pinia → React Context
🛣️ Vue Router → React Router
🎨 Vue SFC → React TSX + CSS Modules

Starting migration...
`);

    const startTime = Date.now();

    try {
      // 1. Find all Vue components
      const vueFiles = await this.findVueFiles(this.srcPath);
      console.log(`📁 Found ${vueFiles.length} Vue components to convert`);

      // 2. Convert Vue components to React
      const conversions = [];
      for (const vueFile of vueFiles) {
        console.log(`🔄 Converting: ${path.relative(this.srcPath, vueFile)}`);
        const conversion = await this.convertVueComponent(vueFile);
        if (conversion) {
          conversions.push({ vueFile, ...conversion });
        }
      }

      // 3. Find and convert Pinia stores
      const storeFiles = await this.findStoreFiles();
      console.log(`🏪 Found ${storeFiles.length} Pinia stores to convert`);
      
      const storeConversions = [];
      for (const storeFile of storeFiles) {
        console.log(`🔄 Converting store: ${path.relative(this.srcPath, storeFile)}`);
        const storeConversion = await this.convertPiniaStore(storeFile);
        if (storeConversion) {
          storeConversions.push({ storeFile, ...storeConversion });
        }
      }

      // 4. Write React components
      for (const conversion of conversions) {
        const reactPath = conversion.vueFile.replace('.vue', '.tsx');
        const cssPath = conversion.vueFile.replace('.vue', '.module.css');
        
        await fs.writeFile(reactPath, conversion.tsx);
        await fs.writeFile(cssPath, conversion.css);
        console.log(`✅ Created: ${path.relative(this.srcPath, reactPath)}`);
      }

      // 5. Write React contexts
      const contextsDir = path.join(this.srcPath, 'contexts');
      await fs.mkdir(contextsDir, { recursive: true });
      
      for (const storeConversion of storeConversions) {
        const contextPath = path.join(contextsDir, `${storeConversion.contextName}.tsx`);
        await fs.writeFile(contextPath, storeConversion.code);
        console.log(`✅ Created context: ${path.relative(this.srcPath, contextPath)}`);
      }

      // 6. Update configuration files
      await this.updatePackageJson();
      await this.updateViteConfig();

      // 7. Create App.tsx
      await this.createReactApp(storeConversions);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`
🎉 Migration completed in ${duration}s!

📊 Summary:
   ✅ Components converted: ${conversions.length}
   ✅ Stores converted: ${storeConversions.length}
   ✅ Configuration updated
   ✅ React App.tsx created

📝 Next steps:
   1. Run 'cd frontend && npm install' to install React dependencies
   2. Run 'npm run dev' to start React development server
   3. Test converted components
   4. Update any remaining Vue-specific code manually

⚡ Migration complete - React is ready!
`);

      return {
        components: conversions.length,
        stores: storeConversions.length,
        duration
      };

    } catch (error) {
      console.error(`\n❌ Migration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create React App.tsx
   */
  async createReactApp(storeConversions) {
    const appTsx = `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
${storeConversions.map(store => `import { ${store.contextName.replace('Context', '')}Provider } from './contexts/${store.contextName}';`).join('\n')}

// Lazy load components
const LobbyView = React.lazy(() => import('./views/LobbyView'));
const RoomView = React.lazy(() => import('./views/RoomView'));
const GameView = React.lazy(() => import('./views/GameView'));
const SettingsView = React.lazy(() => import('./views/SettingsView'));
const AboutView = React.lazy(() => import('./views/AboutView'));
const NotFoundView = React.lazy(() => import('./views/NotFoundView'));

function App() {
  return (
    ${storeConversions.map(store => `<${store.contextName.replace('Context', '')}Provider>`).join('\n    ')}
    <Router>
      <div className="app">
        <React.Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<LobbyView />} />
            <Route path="/room/:id" element={<RoomView />} />
            <Route path="/game/:id" element={<GameView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/about" element={<AboutView />} />
            <Route path="*" element={<NotFoundView />} />
          </Routes>
        </React.Suspense>
      </div>
    </Router>
    ${storeConversions.map(store => `</${store.contextName.replace('Context', '')}Provider>`).reverse().join('\n    ')}
  );
}

export default App;`;

    const appPath = path.join(this.srcPath, 'App.tsx');
    await fs.writeFile(appPath, appTsx);
    console.log('✅ Created React App.tsx');
    
    // Also create main.tsx for React
    const mainTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/main.scss';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

    const mainPath = path.join(this.srcPath, 'main.tsx');
    await fs.writeFile(mainPath, mainTsx);
    console.log('✅ Created React main.tsx');
  }
}

// ===== EXECUTE MIGRATION =====

if (import.meta.url === `file://${process.argv[1]}`) {
  const converter = new VueToReactConverter();
  converter.migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { VueToReactConverter };