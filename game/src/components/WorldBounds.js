export const TILE_SIZE = 30;
export const TILE_COUNT = 20;
export const MAP_HALF_SIZE = TILE_SIZE * TILE_COUNT / 2;

export function isInsideMap(entity, position, heading) {
  const cosine = Math.cos(heading);
  const sine = Math.sin(heading);

  return entity.footprint.every((point) => (
    Math.abs(position.x + point.x * cosine - point.y * sine) <= MAP_HALF_SIZE
    && Math.abs(position.y + point.x * sine + point.y * cosine) <= MAP_HALF_SIZE
  ));
}

export function isMapMoveClear(entity, nextPosition, heading) {
  // Both endpoints inside a convex floor keep the whole translated path inside.
  return isInsideMap(entity, entity.position, heading)
    && isInsideMap(entity, nextPosition, heading);
}
