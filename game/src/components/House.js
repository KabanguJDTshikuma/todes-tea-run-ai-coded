import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { createFootprint } from './Collision.js';

const HOUSE_SCALE = 65;

export async function createHouseFactory() {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/small_house.glb`);

  return () => {
    const model = clone(gltf.scene);
    model.scale.setScalar(HOUSE_SCALE);
    // Local Y becomes world Z after the model's Z-up alignment.
    model.rotation.set(Math.PI / 2, Math.floor(Math.random() * 4) * Math.PI / 2, 0);
    model.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(model);
    model.position.set(
      -(bounds.min.x + bounds.max.x) / 2,
      -(bounds.min.y + bounds.max.y) / 2,
      -bounds.min.z,
    );

    model.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    const house = new THREE.Group();
    house.footprint = createFootprint(model);
    house.heading = 0;
    house.add(model);
    return house;
  };
}
