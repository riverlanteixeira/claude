/**
 * @fileoverview Exemplo de integração do sistema de otimização com o projeto Stranger Things AR
 */

/**
 * Exemplo de integração do sistema de otimização de modelos 3D
 * com o projeto Stranger Things AR existente
 */
class StrangerThingsOptimizationExample {
    constructor() {
        this.optimizationSystem = null;
        this.isInitialized = false;
        this.models = {
            will: null,
            bike: null
        };
    }

    /**
     * Inicializa o sistema de otimização
     */
    async initialize() {
        if (this.isInitialized) return;

        console.log('Inicializando sistema de otimização para Stranger Things AR...');

        try {
            // Criar sistema com configuração otimizada para AR móvel
            this.optimizationSystem = await initializeOptimizationSystem({
                preset: 'balanced',
                lod: {
                    // Distâncias ajustadas para experiência AR
                    distances: { near: 2, medium: 5, far: 10 },
                    autoOptimize: true,
                    maxActiveModels: 3 // Poucos modelos para AR móvel
                },
                cache: {
                    maxSize: 80 * 1024 * 1024, // 80MB para dispositivos móveis
                    maxEntries: 20
                },
                performance: {
                    targetFPS: 30, // 30 FPS para AR móvel
                    alertThreshold: 0.75
                },
                debug: {
                    enabled: true,
                    logPerformance: true
                }
            });

            // Registrar modelos do projeto
            await this.registerProjectModels();

            // Configurar callbacks
            this.setupCallbacks();

            this.isInitialized = true;
            console.log('Sistema de otimização inicializado com sucesso!');

        } catch (error) {
            console.error('Erro ao inicializar sistema de otimização:', error);
            throw error;
        }
    }

    /**
     * Registra os modelos do projeto no sistema de otimização
     */
    async registerProjectModels() {
        // Registrar Will Byers (personagem principal)
        await this.optimizationSystem.registerModel('will', {
            high: 'assets/models/will_byers.glb',
            medium: 'assets/models/will_byers_medium.glb', // Seria necessário criar
            low: 'assets/models/will_byers_low.glb'        // Seria necessário criar
        }, {
            type: 'character',
            priority: 10, // Máxima prioridade
            preload: true,
            element: document.getElementById('will')
        });

        // Registrar Bicicleta (prop importante)
        await this.optimizationSystem.registerModel('bike', {
            high: 'assets/models/bicicleta-will.glb',
            medium: 'assets/models/bicicleta-will_medium.glb', // Seria necessário criar
            low: 'assets/models/bicicleta-will_low.glb'        // Seria necessário criar
        }, {
            type: 'prop',
            priority: 7,
            preload: false, // Carregar sob demanda
            element: document.getElementById('bike')
        });

        console.log('Modelos registrados no sistema de otimização');
    }

    /**
     * Configura callbacks do sistema
     */
    setupCallbacks() {
        // Callback para mudanças de qualidade
        this.optimizationSystem.lodManager.on('qualityChange', (data) => {
            console.log(`🔄 Qualidade alterada: ${data.entityId} ${data.previousQuality} → ${data.newQuality}`);
            
            // Mostrar feedback visual (opcional)
            this.showQualityChangeNotification(data);
        });

        // Callback para carregamento de modelos
        this.optimizationSystem.lodManager.on('modelLoad', (data) => {
            console.log(`📦 Modelo carregado: ${data.entityId}`);
        });

        // Callback para otimização
        this.optimizationSystem.lodManager.on('optimizationStart', (data) => {
            console.log('⚡ Otimização automática iniciada');
        });

        this.optimizationSystem.lodManager.on('optimizationEnd', (data) => {
            const finalFPS = data.finalMetrics.fps;
            console.log(`✅ Otimização concluída - FPS: ${finalFPS}`);
        });
    }

    /**
     * Integra o sistema com o loop de hit-test existente
     * @param {XRFrame} frame - Frame XR atual
     * @param {XRReferenceSpace} referenceSpace - Espaço de referência
     */
    integrateWithHitTest(frame, referenceSpace) {
        if (!this.isInitialized) return;

        // Obter posição da câmera
        const camera = document.querySelector('[camera]');
        if (!camera) return;

        const cameraPosition = camera.object3D.position;

        // Atualizar LOD para todos os modelos visíveis
        ['will', 'bike'].forEach(async (modelId) => {
            const element = document.getElementById(modelId);
            if (!element || !element.getAttribute('visible')) return;

            const modelPosition = element.object3D.position;
            const distance = cameraPosition.distanceTo(modelPosition);

            // Atualizar LOD baseado na distância
            await this.optimizationSystem.updateModelLOD(modelId, {
                position: cameraPosition,
                distance: distance
            });
        });
    }

    /**
     * Integra com o sistema de colocação de objetos existente
     * @param {string} objectId - ID do objeto sendo colocado
     * @param {XRPose} pose - Pose onde o objeto será colocado
     */
    async integrateWithObjectPlacement(objectId, pose) {
        if (!this.isInitialized) return;

        console.log(`🎯 Colocando objeto otimizado: ${objectId}`);

        // Obter informações do modelo
        const modelInfo = this.optimizationSystem.getModelInfo(objectId);
        
        if (modelInfo) {
            // Forçar carregamento de qualidade apropriada baseada na distância
            const camera = document.querySelector('[camera]');
            if (camera) {
                const cameraPos = camera.object3D.position;
                const objectPos = new THREE.Vector3().setFromMatrixPosition(
                    new THREE.Matrix4().fromArray(pose.transform.matrix)
                );
                const distance = cameraPos.distanceTo(objectPos);

                // Atualizar LOD imediatamente
                await this.optimizationSystem.updateModelLOD(objectId, {
                    position: cameraPos,
                    distance: distance
                });
            }
        }
    }

    /**
     * Mostra notificação de mudança de qualidade (opcional)
     * @param {Object} data - Dados da mudança de qualidade
     */
    showQualityChangeNotification(data) {
        // Criar notificação visual simples
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
            transition: opacity 0.3s;
        `;
        notification.textContent = `${data.entityId}: ${data.previousQuality} → ${data.newQuality}`;
        
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Obtém estatísticas do sistema para debug
     */
    getDebugStats() {
        if (!this.isInitialized) return null;

        const stats = this.optimizationSystem.getSystemStats();
        
        return {
            fps: stats.performance.fps,
            memoryUsage: `${stats.performance.memoryUsage.percentage}%`,
            cacheHitRate: `${stats.cache.performance.hitRate}%`,
            activeModels: stats.models.loaded,
            totalOptimizations: stats.system.totalOptimizationRuns,
            modelsInfo: {
                will: this.optimizationSystem.getModelInfo('will'),
                bike: this.optimizationSystem.getModelInfo('bike')
            }
        };
    }

    /**
     * Força otimização manual (para testes)
     */
    async forceOptimization() {
        if (!this.isInitialized) return;

        console.log('🔧 Forçando otimização manual...');
        await this.optimizationSystem.optimizeSystem();
    }

    /**
     * Alterna entre presets de qualidade
     * @param {string} preset - Preset desejado ('quality', 'performance', 'balanced')
     */
    switchQualityPreset(preset) {
        if (!this.isInitialized) return;

        console.log(`🎛️ Alterando para preset: ${preset}`);
        
        const presetConfigs = {
            quality: {
                lod: { distances: { near: 3, medium: 8, far: 15 } },
                performance: { targetFPS: 60 }
            },
            performance: {
                lod: { distances: { near: 1, medium: 3, far: 6 } },
                performance: { targetFPS: 24 }
            },
            balanced: {
                lod: { distances: { near: 2, medium: 5, far: 10 } },
                performance: { targetFPS: 30 }
            }
        };

        if (presetConfigs[preset]) {
            this.optimizationSystem.updateConfig(presetConfigs[preset]);
        }
    }

    /**
     * Limpa o sistema
     */
    cleanup() {
        if (this.optimizationSystem) {
            this.optimizationSystem.destroy();
            this.optimizationSystem = null;
        }
        this.isInitialized = false;
        console.log('Sistema de otimização limpo');
    }
}

/**
 * Exemplo de integração com o código existente do index.html
 */
function integrateWithExistingCode() {
    // Criar instância do sistema de otimização
    const optimizationExample = new StrangerThingsOptimizationExample();
    
    // Modificar a função initGame existente
    const originalInitGame = window.initGame || function() {};
    
    window.initGame = async function() {
        // Executar inicialização original
        originalInitGame.call(this);
        
        // Inicializar sistema de otimização
        try {
            await optimizationExample.initialize();
            console.log('✅ Sistema de otimização integrado com sucesso!');
            
            // Disponibilizar globalmente para debug
            window.optimizationExample = optimizationExample;
            
        } catch (error) {
            console.error('❌ Erro ao integrar sistema de otimização:', error);
        }
    };
    
    // Modificar a função onXRFrame existente
    const originalOnXRFrame = window.onXRFrame || function() {};
    
    window.onXRFrame = function(timestamp, frame) {
        // Executar frame original
        originalOnXRFrame.call(this, timestamp, frame);
        
        // Integrar com sistema de otimização
        if (optimizationExample.isInitialized && frame) {
            const referenceSpace = sceneEl.renderer.xr.getReferenceSpace();
            optimizationExample.integrateWithHitTest(frame, referenceSpace);
        }
    };
    
    // Modificar a função placeObject existente
    const originalPlaceObject = window.placeObject || function() {};
    
    window.placeObject = async function(pose) {
        // Executar colocação original
        originalPlaceObject.call(this, pose);
        
        // Integrar com sistema de otimização
        if (optimizationExample.isInitialized && window.currentObjectIndex < window.objectsToPlace.length) {
            const objectId = window.objectsToPlace[window.currentObjectIndex];
            await optimizationExample.integrateWithObjectPlacement(objectId, pose);
        }
    };
    
    // Adicionar controles de debug (opcional)
    if (window.location.search.includes('debug=true')) {
        addDebugControls(optimizationExample);
    }
}

/**
 * Adiciona controles de debug na interface
 * @param {StrangerThingsOptimizationExample} optimizationExample - Instância do sistema
 */
function addDebugControls(optimizationExample) {
    const debugPanel = document.createElement('div');
    debugPanel.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        border-radius: 10px;
        font-family: monospace;
        font-size: 12px;
        z-index: 1000;
        min-width: 250px;
    `;
    
    debugPanel.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">🔧 Debug Otimização</h3>
        <div id="debug-stats"></div>
        <div style="margin-top: 10px;">
            <button onclick="window.optimizationExample.forceOptimization()">Otimizar</button>
            <button onclick="window.optimizationExample.switchQualityPreset('performance')">Performance</button>
            <button onclick="window.optimizationExample.switchQualityPreset('quality')">Qualidade</button>
        </div>
    `;
    
    document.body.appendChild(debugPanel);
    
    // Atualizar estatísticas a cada 2 segundos
    setInterval(() => {
        const stats = optimizationExample.getDebugStats();
        if (stats) {
            document.getElementById('debug-stats').innerHTML = `
                <div>FPS: ${stats.fps}</div>
                <div>Memória: ${stats.memoryUsage}</div>
                <div>Cache: ${stats.cacheHitRate}</div>
                <div>Modelos: ${stats.activeModels}</div>
                <div>Will: ${stats.modelsInfo.will?.currentQuality || 'N/A'}</div>
                <div>Bike: ${stats.modelsInfo.bike?.currentQuality || 'N/A'}</div>
            `;
        }
    }, 2000);
}

// Auto-executar integração quando o script for carregado
if (typeof window !== 'undefined') {
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', integrateWithExistingCode);
    } else {
        integrateWithExistingCode();
    }
}

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StrangerThingsOptimizationExample,
        integrateWithExistingCode,
        addDebugControls
    };
}