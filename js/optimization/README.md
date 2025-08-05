# Sistema de Otimização de Modelos 3D

Este sistema implementa técnicas avançadas de otimização para modelos 3D em aplicações WebXR/AR, incluindo Level of Detail (LOD), cache inteligente, monitoramento de performance e detecção automática de capacidades do dispositivo.

## Arquitetura

O sistema é composto por várias classes modulares que trabalham em conjunto:

### Componentes Principais

- **LODManager**: Gerenciador principal que coordena todos os componentes
- **ModelCache**: Sistema de cache inteligente com políticas LRU
- **PerformanceMonitor**: Monitor de performance em tempo real
- **DeviceDetector**: Detector de capacidades do dispositivo
- **ModelOptimizationSystem**: API unificada para uso do sistema

### Fluxo de Funcionamento

1. **Inicialização**: O sistema detecta as capacidades do dispositivo
2. **Configuração**: Ajusta automaticamente as configurações baseado no dispositivo
3. **Registro**: Modelos são registrados com diferentes qualidades (low/medium/high)
4. **Monitoramento**: Performance é monitorada continuamente
5. **Otimização**: Qualidade dos modelos é ajustada baseada na distância e performance

## Uso Básico

### Inicialização

```javascript
// Importar arquivos necessários
<script src="js/optimization/types.js"></script>
<script src="js/optimization/DeviceDetector.js"></script>
<script src="js/optimization/PerformanceMonitor.js"></script>
<script src="js/optimization/ModelCache.js"></script>
<script src="js/optimization/LODManager.js"></script>
<script src="js/optimization/config.js"></script>
<script src="js/optimization/index.js"></script>

// Inicializar sistema
const system = await initializeOptimizationSystem({
    preset: 'balanced', // 'quality', 'performance', 'balanced', 'development'
    lod: {
        distances: { near: 3, medium: 8, far: 15 }
    }
});
```

### Registro de Modelos

```javascript
// Registrar um modelo com diferentes qualidades
await system.registerModel('will-byers', {
    high: 'assets/models/will_byers_high.glb',
    medium: 'assets/models/will_byers_medium.glb',
    low: 'assets/models/will_byers_low.glb'
}, {
    type: 'character',
    priority: 8,
    preload: true
});
```

### Atualização de LOD

```javascript
// No loop de renderização ou quando a câmera se move
const cameraPosition = camera.object3D.position;
const modelPosition = modelElement.object3D.position;

await system.updateModelLOD('will-byers', {
    position: cameraPosition,
    distance: cameraPosition.distanceTo(modelPosition)
});
```

## Configuração

### Presets Disponíveis

- **quality**: Máxima qualidade visual (dispositivos high-end)
- **performance**: Máxima performance (dispositivos low-end)
- **balanced**: Equilibrio entre qualidade e performance (padrão)
- **development**: Configuração para desenvolvimento com debug ativado

### Configuração Personalizada

```javascript
const customConfig = {
    lod: {
        distances: { near: 2, medium: 6, far: 12 },
        autoOptimize: true,
        maxActiveModels: 8
    },
    cache: {
        maxSize: 150 * 1024 * 1024, // 150MB
        maxEntries: 75
    },
    performance: {
        targetFPS: 30,
        alertThreshold: 0.8
    },
    debug: {
        enabled: true,
        showStats: true
    }
};

const system = new ModelOptimizationSystem(customConfig);
```

## Tipos de Modelo

O sistema suporta diferentes tipos de modelo com configurações otimizadas:

- **character**: Personagens (alta prioridade, qualidade preferencial)
- **prop**: Objetos/props (prioridade média)
- **environment**: Elementos de ambiente (baixa prioridade)
- **ui**: Elementos de interface (máxima prioridade)

## API Completa

### ModelOptimizationSystem

```javascript
// Inicialização
await system.initialize()

// Registro de modelos
await system.registerModel(entityId, modelPaths, options)

// Atualização de LOD
await system.updateModelLOD(entityId, cameraData)

// Otimização manual
await system.optimizeSystem(targetFPS)

// Estatísticas
const stats = system.getSystemStats()

// Informações de modelo
const info = system.getModelInfo(entityId)

// Configuração
system.updateConfig(newConfig)
const config = system.exportConfig()

// Controle
system.pause()
system.resume()
system.destroy()
```

### Callbacks e Eventos

```javascript
// Registrar callbacks para eventos
system.lodManager.on('qualityChange', (data) => {
    console.log(`Qualidade alterada: ${data.entityId} ${data.previousQuality} → ${data.newQuality}`);
});

system.lodManager.on('modelLoad', (data) => {
    console.log(`Modelo carregado: ${data.entityId}`);
});

system.lodManager.on('optimizationStart', (data) => {
    console.log('Otimização iniciada');
});
```

## Integração com A-Frame

### Componente A-Frame (Exemplo)

```javascript
AFRAME.registerComponent('optimized-model', {
    schema: {
        high: { type: 'string' },
        medium: { type: 'string' },
        low: { type: 'string' },
        type: { type: 'string', default: 'prop' },
        priority: { type: 'number', default: 5 }
    },
    
    async init() {
        // Obter sistema de otimização
        this.optimizationSystem = getOptimizationSystem();
        
        // Registrar modelo
        await this.optimizationSystem.registerModel(this.el.id, {
            high: this.data.high,
            medium: this.data.medium,
            low: this.data.low
        }, {
            type: this.data.type,
            priority: this.data.priority,
            element: this.el
        });
        
        // Obter câmera
        this.camera = document.querySelector('[camera]');
    },
    
    tick() {
        if (!this.camera) return;
        
        // Calcular distância
        const cameraPos = this.camera.object3D.position;
        const modelPos = this.el.object3D.position;
        const distance = cameraPos.distanceTo(modelPos);
        
        // Atualizar LOD
        this.optimizationSystem.updateModelLOD(this.el.id, {
            position: cameraPos,
            distance: distance
        });
    }
});
```

### Uso no HTML

```html
<a-entity id="will-model" 
          optimized-model="high: assets/models/will_high.glb; 
                          medium: assets/models/will_medium.glb; 
                          low: assets/models/will_low.glb;
                          type: character;
                          priority: 8">
</a-entity>
```

## Monitoramento e Debug

### Estatísticas em Tempo Real

```javascript
// Obter estatísticas completas
const stats = system.getSystemStats();
console.log('FPS:', stats.performance.fps);
console.log('Uso de Memória:', stats.performance.memoryUsage.percentage + '%');
console.log('Cache Hit Rate:', stats.cache.performance.hitRate + '%');
console.log('Modelos Ativos:', stats.models.loaded);
```

### Debug Mode

```javascript
// Ativar modo debug
system.updateConfig({
    debug: {
        enabled: true,
        showStats: true,
        logPerformance: true
    }
});
```

## Performance e Otimização

### Orçamentos de Performance

O sistema define orçamentos automáticos baseados no tier do dispositivo:

- **Low-end**: 50MB memória, 20k triângulos, 24 FPS
- **Mid-range**: 100MB memória, 50k triângulos, 30 FPS  
- **High-end**: 200MB memória, 100k triângulos, 60 FPS

### Estratégias de Otimização

1. **LOD Automático**: Qualidade baseada na distância
2. **Cache Inteligente**: LRU com limpeza automática
3. **Detecção de Performance**: Ajustes automáticos quando FPS cai
4. **Gerenciamento de Memória**: Descarregamento automático de modelos não utilizados
5. **Pré-carregamento**: Modelos de baixa qualidade carregados primeiro

## Requisitos

- **Three.js**: Para manipulação de modelos 3D
- **A-Frame**: Para integração com WebXR (opcional)
- **WebGL**: Suporte a WebGL 1.0 ou superior
- **Navegador Moderno**: Chrome 80+, Safari 13+, Firefox 75+

## Limitações

- Requer modelos em múltiplas qualidades (low/medium/high)
- Performance de detecção de GPU limitada em alguns navegadores
- Cache limitado pela memória disponível do dispositivo
- Funcionalidades avançadas podem não estar disponíveis em todos os dispositivos

## Troubleshooting

### Problemas Comuns

1. **Modelos não carregam**: Verificar caminhos dos arquivos
2. **Performance baixa**: Reduzir orçamentos ou usar preset 'performance'
3. **Uso alto de memória**: Reduzir tamanho do cache ou número de modelos ativos
4. **LOD não funciona**: Verificar se distâncias estão configuradas corretamente

### Logs de Debug

```javascript
// Ativar logs detalhados
system.updateConfig({
    debug: {
        enabled: true,
        logLevel: 'debug',
        logCacheOperations: true
    }
});
```