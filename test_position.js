
const objects = [
    { id: 1, x: 10, y: 10, rotation: 0, parentId: null },
    { id: 2, x: 5, y: 0, rotation: 90, parentId: 1 }
];
const objectsById = new Map(objects.map(o => [o.id, o]));

const getObjectAbsolutePosition = (objectId, objectsById) => {
    let currentId = objectId;
    let absX = 0;
    let absY = 0;
    let currentRotation = 0;
    let safety = 100;
    const path = [];
    
    while(currentId && safety-- > 0) {
        const obj = objectsById.get(currentId);
        if (!obj) break;
        path.unshift(obj);
        currentId = obj.parentId;
    }
    
    for (const obj of path) {
        const rad = currentRotation * Math.PI / 180;
        const rotatedX = obj.x * Math.cos(rad) - obj.y * Math.sin(rad);
        const rotatedY = obj.x * Math.sin(rad) + obj.y * Math.cos(rad);
        
        absX += rotatedX;
        absY += rotatedY;
        
        currentRotation += (obj.rotation || 0) + (obj.animRotation || 0);
    }
    return { x: absX, y: absY, rotation: currentRotation };
};

console.log(getObjectAbsolutePosition(2, objectsById));
