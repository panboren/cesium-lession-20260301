/**
 * Cesium 类型扩展
 * 补充 Cesium 内部属性的类型定义
 */

declare module 'cesium' {
  namespace Entity {
    interface ConstructorOptions {
      polyline?: PolylineGraphics.ConstructorOptions
      polygon?: PolygonGraphics.ConstructorOptions
      ellipse?: EllipseGraphics.ConstructorOptions
      rectangle?: RectangleGraphics.ConstructorOptions
    }
  }

  interface PolylineGraphics {
    positions?: Cesium.CallbackProperty | Cesium.PositionProperty
  }

  interface PolygonGraphics {
    hierarchy?: Cesium.CallbackProperty | Cesium.PolygonHierarchy
  }

  interface EllipseGraphics {
    semiMinorAxis?: Cesium.CallbackProperty | Cesium.Property
    semiMajorAxis?: Cesium.CallbackProperty | Cesium.Property
  }

  interface RectangleGraphics {
    coordinates?: Cesium.Rectangle
  }
}
