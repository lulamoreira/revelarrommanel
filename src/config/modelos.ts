/**
 * URLs do MediaPipe. Troque por arquivos locais (ex.: "/mediapipe/wasm") sem mexer no resto do código.
 * A versão do wasm DEVE ser a mesma do pacote @mediapipe/tasks-vision no package.json.
 */
export const MEDIAPIPE_VERSAO = "1.2.3";

export const MODELOS = {
  wasm: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSAO}/wasm`,
  rosto:
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  pose:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  mao:
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
} as const;
