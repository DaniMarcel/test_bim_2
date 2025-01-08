import { useEffect, useState } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as BUI from '@thatopen/ui';
import * as BUIC from '@thatopen/ui-obc';
import * as OBCF from '@thatopen/components-front';

interface CivilCrossProps {
  components: OBC.Components;
  world: OBC.World;
}

const CivilCross: React.FC<CivilCrossProps> = ({ components, world }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!components || !world || !world.scene) return;

    const init = async () => {
      try {
        // Initialize UI Components
        BUI.Manager.init();
        BUIC.Manager.init();

        // Create 2D world containers
        const world2DLeft = document.createElement('div');
        world2DLeft.id = 'scene-2d-left';
        world2DLeft.style.cssText = `
          position: absolute;
          bottom: 20px;
          left: 20px;
          width: 300px;
          height: 200px;
          border: 2px solid white;
          border-radius: 8px;
          z-index: 10;
        `;

        const world2DRight = document.createElement('div');
        world2DRight.id = 'scene-2d-right';
        world2DRight.style.cssText = `
          position: absolute;
          bottom: 20px;
          left: 340px;
          width: 300px;
          height: 200px;
          border: 2px solid white;
          border-radius: 8px;
          z-index: 10;
        `;

        document.body.appendChild(world2DLeft);
        document.body.appendChild(world2DRight);

        // Get required components
        const fragments = components.get(OBC.FragmentsManager);
        const planNavigator = components.get(OBCF.CivilPlanNavigator);
        const navigator3D = components.get(OBCF.Civil3DNavigator);
        const crossNavigator = components.get(OBCF.CivilCrossSectionNavigator);

        // Load model
        const file = await fetch("https://thatopen.github.io/engine_components/resources/road.frag");
        const data = await file.arrayBuffer();
        const buffer = new Uint8Array(data);
        const model = fragments.load(buffer);
        world.scene.three.add(model);

        const properties = await fetch("https://thatopen.github.io/engine_components/resources/road.json");
        model.setLocalProperties(await properties.json());

        // Setup navigators after model is loaded
        navigator3D.world = world;
        navigator3D.draw(model);

        // Use the existing world for planNavigator and crossNavigator
        planNavigator.world = world;
        await planNavigator.draw(model);

        crossNavigator.world = world;
        crossNavigator.world3D = world;

        // Bind events
        planNavigator.onMarkerChange.add(({ alignment, percentage, type, curve }) => {
          navigator3D.setMarker(alignment, percentage, type);
          if (type === 'select') {
            const mesh = curve.alignment.absolute[curve.index].mesh;
            const point = alignment.getPointAt(percentage, 'absolute');
            crossNavigator.set(mesh, point);
          }
        });

        planNavigator.onHighlight.add(({ mesh }) => {
          navigator3D.highlighter.select(mesh);
          const index = mesh.curve.index;
          const curve3d = mesh.curve.alignment.absolute[index];
          curve3d.mesh.geometry.computeBoundingSphere();
          const sphere = curve3d.mesh.geometry.boundingSphere;
          if (sphere) {
            if (world.camera.controls) {
              world.camera.controls.fitToSphere(sphere, true);
            }
          }
        });

        planNavigator.onMarkerHidden.add(({ type }) => {
          navigator3D.hideMarker(type);
        });

        // Optional: style cross sections by IFC category
        const classifier = components.get(OBC.Classifier);
        classifier.byEntity(model);
        const clipper = components.get(OBCF.ClipEdges);
        const classifications = classifier.list;

        for (const category in classifications.entities) {
          const found = classifier.find({ entities: [category] });
          const randomColor = new THREE.Color(Math.random(), Math.random(), Math.random());
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: randomColor, 
            linewidth: 2, 
            linecap: 'round', 
            linejoin: 'round' 
          });

          clipper.styles.create(category, new Set(), world, lineMaterial);

          for (const fragID in found) {
            const foundFrag = fragments.list.get(fragID);
            if (!foundFrag) continue;
            clipper.styles.list[category].fragments[fragID] = new Set(found[fragID]);
            clipper.styles.list[category].meshes.add(foundFrag.mesh);
          }
        }
        clipper.update(true);

        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing CivilCross:", error);
        setIsLoading(false);
      }
    };

    init();

    return () => {
      const left = document.getElementById('scene-2d-left');
      const right = document.getElementById('scene-2d-right');
      if (left) document.body.removeChild(left);
      if (right) document.body.removeChild(right);
    };
  }, [components, world]);

  return null;
};

export default CivilCross;