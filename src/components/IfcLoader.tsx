import { useEffect, useRef } from 'react';
import * as OBC from '@thatopen/components';
import * as BUI from '@thatopen/ui';
import * as WEBIFC from 'web-ifc';

interface IFCLoaderProps {
  components: OBC.Components;
  world: any; // Replace with proper type
}

const IFCLoader: React.FC<IFCLoaderProps> = ({ components, world }) => {
  useEffect(() => {
    const fragments = components.get(OBC.FragmentsManager);
    const fragmentIfcLoader = components.get(OBC.IfcLoader);

    const setupLoader = async () => {
      await fragmentIfcLoader.setup();
      
      const excludedCats = [
        WEBIFC.IFCTENDONANCHOR,
        WEBIFC.IFCREINFORCINGBAR,
        WEBIFC.IFCREINFORCINGELEMENT,
      ];
      
      for (const cat of excludedCats) {
        fragmentIfcLoader.settings.excludedCategories.add(cat);
      }

      fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;
    };

    // Modified loadIfc function to handle File objects
    const loadIfc = async (file: File) => {
      try {
        const buffer = await file.arrayBuffer();
        const model = await fragmentIfcLoader.load(new Uint8Array(buffer));
        model.name = file.name;
        world.scene.three.add(model);
      } catch (error) {
        console.error("Error loading IFC file:", error);
      }
    };

    // Handle file selection
    const handleFileSelect = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.name.toLowerCase().endsWith('.ifc')) {
          loadIfc(file);
        } else {
          alert('Please select an IFC file');
        }
      }
    };

    // Export fragments function
    const exportFragments = async () => {
      if (!fragments.groups.size) return;
      
      const group = Array.from(fragments.groups.values())[0];
      const data = fragments.export(group);
      const file = new File([new Blob([data])], "small.frag");
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();

      const properties = group.getLocalProperties();
      if (properties) {
        const jsonFile = new File([JSON.stringify(properties)], "small.json");
        const jsonLink = document.createElement("a");
        jsonLink.href = URL.createObjectURL(jsonFile);
        jsonLink.download = jsonFile.name;
        document.body.appendChild(jsonLink);
        jsonLink.click();
        jsonLink.remove();
      }
    };

    // Create UI panel with file input
    const panel = BUI.Component.create(() => {
      return BUI.html`
        <bim-panel active label="IFC Loader" class="options-menu"
        style="position: absolute; top: 380px;">
          <bim-panel-section collapsed label="Controls">
            <bim-panel-section style="padding-top: 12px;">
              <input type="file" 
                accept=".ifc"
                style="display: none;"
                id="ifc-file-input"
                @change="${handleFileSelect}"
              />
              <bim-button label="Load IFC File" 
                @click="${() => document.getElementById('ifc-file-input')?.click()}">
              </bim-button>
              <bim-button label="Export fragments" @click="${exportFragments}"></bim-button>
              <bim-button label="Dispose fragments" @click="${() => fragments.dispose()}"></bim-button>
            </bim-panel-section>
          </bim-panel-section>
        </bim-panel>
      `;
    });

    // Initialize UI
    BUI.Manager.init();
    document.body.append(panel);

    // Setup loader
    setupLoader();

    // Cleanup
    return () => {
      fragments.dispose();
      document.body.removeChild(panel);
    };
  }, [components, world]);

  return null;
};

export default IFCLoader;