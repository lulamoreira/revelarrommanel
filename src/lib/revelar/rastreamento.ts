/**
 * Carregamento sob demanda dos detectores MediaPipe (apenas no navegador).
 * O pacote é importado dinamicamente para não entrar no SSR nem no carregamento inicial.
 */
import type { FaceLandmarker, HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import { MODELOS } from "@/config/modelos";

type Vision = typeof import("@mediapipe/tasks-vision");
type Fileset = Awaited<ReturnType<Vision["FilesetResolver"]["forVisionTasks"]>>;

let visionP: Promise<{ vision: Vision; fileset: Fileset }> | null = null;
let rostoP: Promise<FaceLandmarker> | null = null;
let poseP: Promise<PoseLandmarker> | null = null;
let maoP: Promise<HandLandmarker> | null = null;

function base() {
  if (!visionP) {
    visionP = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(MODELOS.wasm);
      return { vision, fileset };
    })();
    visionP.catch(() => {
      visionP = null;
    });
  }
  return visionP;
}

/** Tenta GPU; se falhar, CPU. */
async function comFallback<T>(criar: (delegate: "GPU" | "CPU") => Promise<T>): Promise<T> {
  try {
    return await criar("GPU");
  } catch (erroGpu) {
    console.warn("GPU indisponível, usando CPU", erroGpu);
    return criar("CPU");
  }
}

function memo<T>(atual: Promise<T> | null, set: (p: Promise<T> | null) => void, fazer: () => Promise<T>) {
  if (atual) return atual;
  const p = fazer();
  set(p);
  p.catch(() => set(null));
  return p;
}

export const carregarRosto = () =>
  memo(rostoP, (p) => (rostoP = p), async () => {
    const { vision, fileset } = await base();
    return comFallback((delegate) =>
      vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODELOS.rosto, delegate },
        runningMode: "VIDEO",
        numFaces: 1,
      }),
    );
  });

export const carregarPose = () =>
  memo(poseP, (p) => (poseP = p), async () => {
    const { vision, fileset } = await base();
    return comFallback((delegate) =>
      vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODELOS.pose, delegate },
        runningMode: "VIDEO",
        numPoses: 1,
      }),
    );
  });

export const carregarMao = () =>
  memo(maoP, (p) => (maoP = p), async () => {
    const { vision, fileset } = await base();
    return comFallback((delegate) =>
      vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODELOS.mao, delegate },
        runningMode: "VIDEO",
        numHands: 2,
      }),
    );
  });

export type { FaceLandmarker, HandLandmarker, PoseLandmarker };
