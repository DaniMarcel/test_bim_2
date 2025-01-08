import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import * as BUI from '@thatopen/ui';
import * as BUIC from "@thatopen/ui-obc";
import IFCLoader from './IfcLoader';

BUIC.Manager.init();

const World: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [worldInstance, setWorldInstance] = useState<any>(null);
  const [componentsInstance, setComponentsInstance] = useState<OBC.Components | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Components
    const components = new OBC.Components();
    setComponentsInstance(components);

    // Get Worlds component
    const worlds = components.get(OBC.Worlds);

    // Create a new world
    const world = worlds.create<
      OBC.SimpleScene,
      OBC.SimpleCamera,
      OBCF.PostproductionRenderer
    >();
    setWorldInstance(world);

    // Set up world components
    world.scene = new OBC.SimpleScene(components);
    world.renderer = new OBCF.PostproductionRenderer(components, containerRef.current);
    world.camera = new OBC.SimpleCamera(components);

    // Initialize components
    components.init();

    // Setup scene
    world.scene.setup();
    world.scene.three.background = null;

    // Add grid to the scene
    const grids = components.get(OBC.Grids);
    const grid = grids.create(world);

    // Set camera position
    world.camera.controls.setLookAt(5, 5, 5, 0, 0, 0);

    // Initialize UI
    BUI.Manager.init();

    // Add minimap
    const maps = new OBC.MiniMaps(components);
    const map = maps.create(world);

    const minimapContainer = document.createElement('div');
    minimapContainer.id = 'minimap';
    minimapContainer.style.position = 'absolute';
    minimapContainer.style.bottom = '20px';
    minimapContainer.style.right = '20px';
    minimapContainer.style.width = '350px';
    minimapContainer.style.height = '150px';
    minimapContainer.style.border = '2px solid white';
    minimapContainer.style.borderRadius = '12px';
    minimapContainer.style.overflow = 'hidden';

    const canvas = map.renderer.domElement;
    canvas.style.borderRadius = '12px';
    minimapContainer.appendChild(canvas);
    document.body.appendChild(minimapContainer);

    map.resize();

    // Get the initial size of the minimap
    const mapSize = map.getSize();

    // Initialize Area Measurement
    const areaDims = components.get(OBCF.AreaMeasurement);
    areaDims.world = world;
    areaDims.enabled = true;

    // Set up mouse events for area measurement
    containerRef.current.ondblclick = () => areaDims.create();
    containerRef.current.oncontextmenu = (event) => {
      event.preventDefault(); // Prevent the context menu from appearing
      areaDims.endCreation();
    };

    // Set up keyboard events for deleting measurements
    window.onkeydown = (event) => {
      if (event.code === "Delete" || event.code === "Backspace") {
        areaDims.deleteAll();
      }
    };

    // Create UI Panel for minimap and grid controls
    const panel = BUI.Component.create<BUI.PanelSection>(() => {
      return BUI.html`
        <bim-panel label="Controls" class="options-menu">
          <!-- Grid Controls -->
          <bim-panel-section collapsed label="Grid Controls">
            <bim-checkbox label="Grid visible" checked 
              @change="${({ target }: { target: BUI.Checkbox }) => {
                grid.config.visible = target.value;
              }}">
            </bim-checkbox>
          
            <bim-color-input 
              label="Grid Color" color="#bbbbbb" 
              @input="${({ target }: { target: BUI.ColorInput }) => {
                grid.config.color = new THREE.Color(target.color);
              }}">
            </bim-color-input>
            
            <bim-number-input 
              slider step="0.1" label="Grid primary size" value="1" min="0" max="10"
              @change="${({ target }: { target: BUI.NumberInput }) => {
                grid.config.primarySize = target.value;
              }}">
            </bim-number-input>
            
            <bim-number-input 
              slider step="0.1" label="Grid secondary size" value="10" min="0" max="20"
              @change="${({ target }: { target: BUI.NumberInput }) => {
                grid.config.secondarySize = target.value;
              }}">
            </bim-number-input>
          </bim-panel-section>

          <!-- Minimap Controls -->
          <bim-panel-section collapsed label="Minimap Controls">
            <bim-checkbox checked="true" label="Enabled" 
              @change="${({ target }: { target: BUI.Checkbox }) => {
                map.enabled = target.value;
              }}">  
            </bim-checkbox>
            
            <bim-checkbox checked="true" label="Visible" 
              @change="${({ target }: { target: BUI.Checkbox }) => {
                map.config.visible = target.value;
              }}">  
            </bim-checkbox>
            
            <bim-checkbox checked label="Lock rotation" 
              @change="${({ target }: { target: BUI.Checkbox }) => {
                map.config.lockRotation = target.value;
              }}">  
            </bim-checkbox>
            
            <bim-number-input 
              slider label="Zoom" value="${map.zoom}" min="0.01" max="0.5" step="0.01" 
              @change="${({ target }: { target: BUI.NumberInput }) => {
                map.config.zoom = target.value;
              }}">
            </bim-number-input>
            
            <bim-number-input 
              slider label="Front offset" value="${map.frontOffset}" min="0" max="5" step="1" 
              @change="${({ target }: { target: BUI.NumberInput }) => {
                map.config.frontOffset = target.value;
              }}">
            </bim-number-input>
            
            <div style="display: flex; gap: 12px">
              <bim-number-input slider value="${mapSize.x}" pref="Size X" min="100" max="500" step="10"              
                @change="${({ target }: { target: BUI.NumberInput }) => {
                  map.config.sizeX = target.value;
                }}">
              </bim-number-input>        
              
              <bim-number-input slider value="${mapSize.y}" pref="Size Y" min="100" max="500" step="10"            
                @change="${({ target }: { target: BUI.NumberInput }) => {
                  map.config.sizeY = target.value;
                }}">
              </bim-number-input>
            </div>
          </bim-panel-section>
        </bim-panel>
      `;
    });

    document.body.appendChild(panel);

    // Create mobile menu toggle button
    const button = BUI.Component.create<BUI.PanelSection>(() => {
      return BUI.html`
        <bim-button 
          class="phone-menu-toggler" 
          icon="solar:settings-bold"
          @click="${() => {
            if (panel.classList.contains('options-menu-visible')) {
              panel.classList.remove('options-menu-visible');
            } else {
              panel.classList.add('options-menu-visible');
            }
          }}">
        </bim-button>
      `;
    });

    document.body.appendChild(button);

    // Cleanup function
    return () => {
      setWorldInstance(null);
      setComponentsInstance(null);
      components.dispose();
      document.body.removeChild(panel);
      document.body.removeChild(button);
      document.body.removeChild(minimapContainer);
      grids.delete(grid);
    };
  }, []);

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />
      {isLoading && <div className="loading-indicator">Loading...</div>}
      {worldInstance && componentsInstance && (
        <IFCLoader 
          world={worldInstance} 
          components={componentsInstance} 
        />
      )}
    </>
  );
};

export default World;