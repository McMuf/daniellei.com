import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export default function AsciiSphere() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const height = 300
    let width = container.clientWidth

    const camera = new THREE.PerspectiveCamera(70, width / height, 1, 1000)
    camera.position.set(0, 0, 220)

    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const pointLight = new THREE.PointLight(0xffffff, 3, 0, 0)
    pointLight.position.set(200, 200, 200)
    scene.add(pointLight)

    const sphere = new THREE.Mesh(
      new THREE.IcosahedronGeometry(90, 2),
      new THREE.MeshPhongMaterial({ flatShading: true }),
    )
    scene.add(sphere)

    const renderer = new THREE.WebGLRenderer()
    renderer.setSize(width, height)

    const effect = new AsciiEffect(renderer, ' .:-+*=%@#', { invert: true, resolution: 0.16 })
    effect.setSize(width, height)
    effect.domElement.style.color = '#45e0c0'
    effect.domElement.style.backgroundColor = 'transparent'
    container.appendChild(effect.domElement)

    const controls = new OrbitControls(camera, effect.domElement)
    controls.enableZoom = false
    controls.enablePan = false
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.6

    let raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      controls.update()
      effect.render(scene, camera)
    }
    animate()

    const onResize = () => {
      width = container.clientWidth
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      effect.setSize(width, height)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      if (effect.domElement.parentNode === container) container.removeChild(effect.domElement)
      renderer.dispose()
      sphere.geometry.dispose()
      ;(sphere.material as THREE.Material).dispose()
    }
  }, [])

  return (
    <div className="ascii-sphere-block">
      <div ref={containerRef} className="ascii-sphere" />
      <p className="ascii-sphere-caption">drag to rotate</p>
    </div>
  )
}
