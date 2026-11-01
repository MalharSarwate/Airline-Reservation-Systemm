import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { CameraControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { cabinLabel, money, type Seat } from '../types';
interface Props {
  seats: Seat[];
  columns: number;
  selected: string[];
  cabin: string;
  onSelect: (s: Seat) => void;
  busy: boolean;
  focusedSeat?: string;
  highlighted?: string[];
  onPreview?: (number: string) => void;
  passengerView?: boolean;
}
function Seats({
  seats,
  selected,
  cabin,
  onSelect,
  busy,
  highlighted = [],
}: Props) {
  const bases = useRef<THREE.InstancedMesh>(null);
  const backs = useRef<THREE.InstancedMesh>(null);
  const [hover, setHover] = useState<Seat | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    seats.forEach((s, i) => {
      const luxury = s.cabin === 'FIRST' || s.cabin === 'BUSINESS';
      dummy.position.set(s.x, 0.45, s.z);
      dummy.scale.set(luxury ? 0.72 : 0.62, 0.18, 0.75);
      dummy.updateMatrix();
      bases.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(s.x, 0.93, s.z + 0.32);
      dummy.scale.set(luxury ? 0.72 : 0.62, luxury ? 1.05 : 0.8, 0.16);
      dummy.updateMatrix();
      backs.current?.setMatrixAt(i, dummy.matrix);
      const color = new THREE.Color(
        selected.includes(s.number)
          ? '#df9a40'
          : highlighted.includes(s.number)
            ? '#a6d9ff'
            : ['OCCUPIED', 'HELD'].includes(s.status)
              ? '#8c9597'
              : s.status === 'BLOCKED'
                ? '#414849'
                : s.cabin !== cabin
                  ? '#bfc7c4'
                  : s.features.includes('EXTRA_LEGROOM')
                    ? '#5b91a2'
                    : s.cabin === 'FIRST'
                      ? '#734e85'
                      : s.cabin === 'BUSINESS'
                        ? '#346b70'
                        : s.cabin === 'PREMIUM'
                          ? '#63866c'
                          : '#315d4e',
      );
      bases.current?.setColorAt(i, color);
      backs.current?.setColorAt(i, color);
    });
    for (const mesh of [bases.current, backs.current])
      if (mesh) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
  }, [seats, selected, cabin, dummy, highlighted]);
  function seatAt(e: ThreeEvent<PointerEvent | MouseEvent>) {
    return e.instanceId === undefined ? undefined : seats[e.instanceId];
  }
  const events = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const s = seatAt(e);
      if (
        s &&
        !busy &&
        s.cabin === cabin &&
        ['AVAILABLE', 'SELECTED'].includes(s.status)
      )
        onSelect(s);
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHover(seatAt(e) ?? null);
    },
    onPointerOut: () => setHover(null),
  };
  return (
    <>
      <instancedMesh
        ref={bases}
        args={[undefined, undefined, seats.length]}
        {...events}
      >
        <boxGeometry />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        ref={backs}
        args={[undefined, undefined, seats.length]}
        {...events}
      >
        <boxGeometry />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      {hover && (
        <Html
          position={[hover.x, 2, hover.z]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="seat-tooltip">
            <strong>
              {hover.number} · {cabinLabel(hover.cabin)}
            </strong>
            <span>
              {money(hover.price)} · {hover.status.toLowerCase()}
            </span>
            <small>
              {hover.features.join(' · ').replaceAll('_', ' ').toLowerCase()}
            </small>
          </div>
        </Html>
      )}
    </>
  );
}
function Interior({ seats, columns }: Pick<Props, 'seats' | 'columns'>) {
  const length = Math.max(...seats.map((s) => s.z)) + 3;
  const width = columns === 6 ? 6.2 : 8.2;
  return (
    <group>
      <mesh position={[0, -0.05, length / 2 - 1]}>
        <boxGeometry args={[width, 0.15, length + 2]} />
        <meshStandardMaterial color="#e2e4db" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[(side * width) / 2, 0.65, length / 2 - 1]}>
            <boxGeometry args={[0.12, 1.4, length + 2]} />
            <meshStandardMaterial color="#e8eae4" transparent opacity={0.55} />
          </mesh>
          <mesh position={[side * (width / 2 - 0.25), 2.5, length / 2 - 1]}>
            <boxGeometry args={[0.55, 0.4, length + 2]} />
            <meshStandardMaterial color="#c6ceca" transparent opacity={0.45} />
          </mesh>
          {Array.from({ length: Math.ceil(length / 1.3) }, (_, i) => (
            <mesh key={i} position={[side * (width / 2 - 0.08), 1.25, i * 1.3]}>
              <boxGeometry args={[0.04, 0.52, 0.55]} />
              <meshStandardMaterial
                color="#8bc4db"
                emissive="#6aa6bc"
                emissiveIntensity={0.35}
              />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.65, -1.8]}>
        <boxGeometry args={[width, 1.4, 0.18]} />
        <meshStandardMaterial color="#c3cbc4" />
      </mesh>
      <Html position={[0, 2, -1.9]} center>
        <span className="cabin-sign">FLIGHT DECK</span>
      </Html>
      <Html position={[0, 2, length]} center>
        <span className="cabin-sign">LAVATORY / GALLEY</span>
      </Html>
      <Html position={[width / 2, 2, 11.7]} center>
        <span className="exit-sign">EXIT</span>
      </Html>
    </group>
  );
}
function Exterior({ length, columns }: { length: number; columns: number }) {
  const radius = columns === 6 ? 3.4 : 4.4;
  return (
    <group>
      <mesh position={[0, 1, length / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, length + 5, 40]} />
        <meshStandardMaterial color="#edf3f7" />
      </mesh>
      <mesh position={[0, 1, -3]} scale={[radius, radius, 5]}>
        <sphereGeometry args={[1, 32, 20]} />
        <meshStandardMaterial color="#edf3f7" />
      </mesh>
      <mesh
        position={[0, 1, length + 4]}
        scale={[radius * 0.8, radius * 0.8, 5]}
      >
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#dce5ee" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[side * 8, 0, length * 0.55]}
            rotation={[0, side * 0.2, side * 0.035]}
          >
            <boxGeometry args={[13, 0.25, 5]} />
            <meshStandardMaterial color="#cedce5" />
          </mesh>
          <mesh
            position={[side * 6, -1.4, length * 0.5]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[1, 1, 3, 24]} />
            <meshStandardMaterial color="#4a6f85" />
          </mesh>
          <mesh
            position={[side * 4, 1, length + 2]}
            rotation={[0, side * 0.2, 0]}
          >
            <boxGeometry args={[8, 0.18, 2.6]} />
            <meshStandardMaterial color="#345f6c" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 4, length + 2]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[0.2, 6, 4]} />
        <meshStandardMaterial color="#345f6c" />
      </mesh>
      {Array.from({ length: 18 }, (_, i) => (
        <mesh
          key={i}
          position={[((i % 3) - 1) * 27, -9 - (i % 4), i * 9 - 45]}
          scale={[12, 2.5, 6]}
        >
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="white" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}
function Camera({
  focus,
  mode,
  length,
  intro,
  onReady,
  onEntered,
}: {
  focus: Seat | undefined;
  mode: string;
  length: number;
  intro: boolean;
  onReady: (ready: boolean) => void;
  onEntered: () => void;
}) {
  const ref = useRef<CameraControls>(null);
  const elapsed = useRef(0);
  const x = focus?.x,
    z = focus?.z;
  useFrame((_, delta) => {
    if (!intro || !ref.current) return;
    elapsed.current += delta;
    const t = Math.min(elapsed.current / 4.5, 1);
    const ease = t * t * (3 - 2 * t);
    if (t < 0.65) {
      const u = ease / 0.718;
      void ref.current.setLookAt(
        42 * (1 - u) + 12 * u,
        22 * (1 - u) + 8 * u,
        length + 30 * (1 - u) - 12 * u,
        0,
        1,
        length * 0.35,
        false,
      );
    } else {
      const u = (t - 0.65) / 0.35;
      void ref.current.setLookAt(
        12 * (1 - u),
        8 * (1 - u) + 3 * u,
        length - 12 * (1 - u),
        0,
        1,
        length * 0.3,
        false,
      );
    }
    if (t >= 1) onEntered();
  });
  useEffect(() => {
    if (intro || !ref.current) return;
    let active = true;
    const motion =
      mode === 'passenger' && x !== undefined && z !== undefined
        ? ref.current.setLookAt(x, 1.6, z + 0.05, x, 1.4, z - 5, true)
        : ref.current.setLookAt(8, 18, length + 8, 0, 0, length / 2, true);
    void motion.then(() => {
      if (active) onReady(true);
    });
    return () => {
      active = false;
    };
  }, [x, z, mode, length, intro, onReady]);
  return (
    <CameraControls
      ref={ref}
      enabled={!intro}
      minDistance={0.2}
      maxDistance={100}
      maxPolarAngle={Math.PI * 0.49}
    />
  );
}
export default function Cabin3D(props: Props) {
  const [mode, setMode] = useState('overview');
  const [overviewFor, setOverviewFor] = useState('');
  const cameraMode =
    props.passengerView && props.focusedSeat !== overviewFor
      ? 'passenger'
      : mode;
  const [ready, setReady] = useState(false);
  const [introActive, setIntro] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const intro = introActive && !props.passengerView;
  const [localPreview, setLocalPreview] = useState('');
  const previewNumber = props.onPreview
    ? props.focusedSeat || ''
    : localPreview;
  function setPreviewNumber(number: string) {
    setLocalPreview(number);
    props.onPreview?.(number);
  }
  const eligible = props.seats.filter((s) => s.cabin === props.cabin);
  const focus =
    props.seats.find(
      (s) =>
        s.number ===
        (previewNumber || props.focusedSeat || props.selected.at(-1)),
    ) ??
    eligible.find((s) => ['AVAILABLE', 'SELECTED'].includes(s.status)) ??
    eligible[0];
  const length = Math.max(...props.seats.map((s) => s.z));
  return (
    <div className="cabin-wrapper">
      <p className="notice">
        Choose a {cabinLabel(props.cabin)} seat below or click a coloured seat
        in the cabin. Grey seats belong to another cabin or are unavailable.
        Passenger view previews a seat without reserving it.
      </p>
      <div className="camera-toolbar">
        <button
          aria-pressed={cameraMode === 'overview'}
          onClick={() => {
            if (!intro && cameraMode === 'overview') return;
            setIntro(false);
            setReady(false);
            setMode('overview');
            setOverviewFor(props.focusedSeat || '');
          }}
        >
          Overview
        </button>
        <button
          disabled={!focus}
          aria-pressed={cameraMode === 'passenger'}
          onClick={() => {
            if (!intro && cameraMode === 'passenger') return;
            setIntro(false);
            setReady(false);
            setMode('passenger');
          }}
        >
          Passenger view {focus?.number}
        </button>
      </div>
      <label>
        Preview seat
        <select
          aria-label="Preview seat"
          value={focus?.number ?? ''}
          onChange={(e) => {
            setPreviewNumber(e.target.value);
            setIntro(false);
            setReady(false);
          }}
        >
          {eligible.map((s) => (
            <option key={s.id} value={s.number}>
              {s.number} · {s.status.toLowerCase()} · {money(s.price)}
            </option>
          ))}
        </select>
      </label>
      {intro && (
        <div className="notice" role="status">
          Flying through the sky into your cabin…{' '}
          <button className="text-button" onClick={() => setIntro(false)}>
            Skip animation
          </button>
        </div>
      )}
      <div
        className="canvas"
        data-camera-ready={ready}
        role="img"
        aria-label="Interactive 3D aircraft cabin. Use the 2D view for keyboard seat selection."
      >
        <Canvas
          dpr={[1, 1.5]}
          frameloop={intro ? 'always' : 'demand'}
          camera={{
            position: [10, 22, length + 8],
            fov: 48,
            near: 0.05,
            far: 150,
          }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={[intro ? '#a9d4ed' : '#e8ede8']} />
          <ambientLight intensity={1.4} />
          <directionalLight position={[8, 15, 5]} intensity={2} />
          <Suspense fallback={null}>
            {intro ? (
              <Exterior length={length} columns={props.columns} />
            ) : (
              <Interior seats={props.seats} columns={props.columns} />
            )}
            {!intro && <Seats {...props} />}
            <Camera
              focus={focus}
              mode={cameraMode}
              length={length}
              onReady={setReady}
              intro={intro}
              onEntered={() => setIntro(false)}
            />
          </Suspense>
        </Canvas>
      </div>
      <div
        className="cabin-seat-picker"
        aria-label="Available seats in selected cabin"
      >
        {eligible.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={
              props.busy || !['AVAILABLE', 'SELECTED'].includes(s.status)
            }
            aria-pressed={props.selected.includes(s.number)}
            onClick={() => {
              setPreviewNumber(s.number);
              props.onSelect(s);
            }}
            title={`${s.features.join(', ')} · ${money(s.price)}`}
          >
            {s.number}
            <small>{money(s.price)}</small>
          </button>
        ))}
      </div>
      <p className="canvas-help">
        Drag to look around · Scroll to zoom · Select a seat to try passenger
        view. For keyboard navigation, switch to 2D.
      </p>
    </div>
  );
}
