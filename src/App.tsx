// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  CheckCircle,
  ChevronRight,
  ScanLine,
  Image as ImageIcon,
  Map,
  Flag,
  Footprints,
  Camera,
  GitBranch,
  Award,
  Quote,
  Sparkles,
  RotateCcw,
  AlertCircle,
  Star,
  X,
  ZoomIn,
} from "lucide-react";

// =====================================================================
// 🔑 [중요] 마스터 코드 설정 (모든 장소 통과 가능)
// =====================================================================
const BASE_URL = "https://snoopytest-mu.vercel.app/?key=";
const MASTER_QR_CODE = `${BASE_URL}snoopy_master`;

// =====================================================================
// 📊 [GTM 변경 반영] 구글 태그 매니저(GTM) 컨테이너 ID 설정
// =====================================================================
const GTM_CONTAINER_ID = "GTM-5LKS6MB7"; // 본인의 실제 GTM ID로 변경해주세요 (예: GTM-T123456)

// =====================================================================
// 📸 [핵심] 카메라 권한 1회 승인 및 세션 유지 매니저
// =====================================================================
let globalCameraStream = null;

const requestCameraPermissionOnce = async () => {
  if (globalCameraStream && globalCameraStream.active) return true;
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("현재 환경에서는 카메라 API를 지원하지 않습니다.");
      return false;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    globalCameraStream = stream;
    globalCameraStream.getTracks().forEach((track) => (track.enabled = false));
    return true;
  } catch (err) {
    console.error("초기 카메라 권한 거부됨:", err);
    return false;
  }
};

// === [모바일 100% 호환 실제 카메라 QR 스캐너] ===
const QRScanner = ({ onScan, onError }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isJsQRLoaded, setIsJsQRLoaded] = useState(false);
  const [camError, setCamError] = useState(false);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  useEffect(() => {
    if (window.jsQR) {
      setIsJsQRLoaded(true);
      return;
    }
    const scriptId = "jsqr-script";
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
      script.onload = () => setIsJsQRLoaded(true);
      script.onerror = () => {
        setCamError(true);
        if (onErrorRef.current)
          onErrorRef.current(new Error("QR Library Load Failed"));
      };
      document.body.appendChild(script);
    } else {
      setIsJsQRLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isJsQRLoaded) return;
    let animationFrameId;
    let lastScanTime = 0;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCamError(true);
        if (onErrorRef.current)
          onErrorRef.current(new Error("Camera API not supported"));
        return;
      }

      if (!globalCameraStream || !globalCameraStream.active) {
        try {
          globalCameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
        } catch (fallbackErr) {
          console.error("카메라 권한 거부", fallbackErr);
          setCamError(true);
          if (onErrorRef.current) onErrorRef.current(fallbackErr);
          return;
        }
      }

      if (globalCameraStream && videoRef.current) {
        globalCameraStream
          .getTracks()
          .forEach((track) => (track.enabled = true));

        videoRef.current.srcObject = globalCameraStream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("autoplay", "true");
        videoRef.current.setAttribute("muted", "true");

        try {
          await videoRef.current.play();
          requestAnimationFrame(tick);
        } catch (e) {
          console.error("비디오 자동재생 실패", e);
        }
      }
    };

    const tick = () => {
      if (
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        if (window.jsQR) {
          const code = window.jsQR(
            imageData.data,
            imageData.width,
            imageData.height,
            { inversionAttempts: "dontInvert" }
          );

          if (code && code.data) {
            const now = Date.now();
            if (now - lastScanTime > 2500) {
              lastScanTime = now;
              if (onScanRef.current) onScanRef.current(code.data);
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      if (globalCameraStream) {
        globalCameraStream
          .getTracks()
          .forEach((track) => (track.enabled = false));
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isJsQRLoaded]);

  return (
    <div className="w-full h-full relative bg-stone-900 flex items-center justify-center overflow-hidden rounded-3xl">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {camError && (
        <div className="absolute text-red-400 text-[11px] font-bold text-center px-4 z-20 bg-stone-900/90 py-3 rounded-xl break-keep w-3/4 shadow-lg border border-red-500/30">
          카메라 권한이 없거나
          <br />
          접근이 차단되었습니다.
        </div>
      )}
      {!isJsQRLoaded && !camError && (
        <div className="absolute text-emerald-400 text-xs font-bold animate-pulse z-20 bg-stone-900/80 px-4 py-2 rounded-lg">
          카메라 로딩 중...
        </div>
      )}
    </div>
  );
};

// === [전체 2대 테마 데이터] ===
const themeData = [
  {
    id: "explore",
    title: "비글 스카우트의 숲속 탐험기",
    type: "탐험형",
    character: "스누피 & 우드스탁",
    color: "emerald",
    completion: {
      title: "비글 스카우트 대원 ",
      dialogues: [
        {
          speaker: "- SNOOPY",
          text: "이걸보러 여기까지 온 거야 제군들. 저 경치 좀 보라고!",
        },
        {
          speaker: "- WOODSTOCK",
          text: "|||| || ||| ||!",
        },
      ],
    },
    path: [
      {
        type: "location",
        name: "소설왕 스누피 광장",
        hint: "소설왕 스누피 광장",
        img: "/images/explore_square.jpg",
        mapImg: "/images/maps/explore_square_map.jpg",
        text: "'어둡고 폭풍우 치는 밤이었다...'",
        source: "- SNOOPY",
        qrCode: `${BASE_URL}sg_explore_01`,
      },
      {
        type: "location",
        name: "비글 스카우트 폭포",
        hint: "비글 스카우트 캠프",
        img: "/images/explore_camp.jpg",
        mapImg: "/images/maps/explore_camp_map.jpg",
        text: "세계적으로 유명한 비글 스카우트가 그의 분대를 이끌고 자연탐사를 떠난다.",
        source: "- SNOOPY",
        qrCode: `${BASE_URL}sg_explore_02`,
      },
      {
        type: "location",
        name: "비글 스카우트 캠프 파이어",
        hint: "도토리숲",
        img: "/images/explore_tent.jpg",
        mapImg: "/images/maps/explore_tent_map.jpg",
        text: "하이킹의 마지막 밤을 위해 좀 특별한 걸 준비했는데... 마시멜로 구워 먹기 어때?",
        source: "- SNOOPY",
        qrCode: `${BASE_URL}sg_explore_03_tent`,
      },
      {
        type: "location",
        name: "때죽나무 숲 미로",
        hint: "비자나무 숲",
        img: "/images/explore_maze.jpg",
        mapImg: "/images/maps/explore_maze_map.jpg",
        text: "괜히 적을 도발하려는 녀석들이 꼭 있다니까!",
        source: "- SNOOPY",
        qrCode: `${BASE_URL}sg_explore_03_maze`,
      },
      {
        type: "location",
        name: "스누피 블럭 전망대",
        hint: "스누피 페르소나 암석원",
        img: "/images/explore_observatory.jpg",
        mapImg: "/images/maps/explore_observatory_map.jpg",
        text: "정찰병 노릇을 할 지원자가 하나 필요한데...",
        source: "- SNOOPY",
        qrCode: `${BASE_URL}sg_explore_04_obs`,
      },
      {
        type: "location",
        name: "스누피 파고라",
        hint: "스누피 페르소나 암석원",
        img: "/images/explore_pagora.jpg",
        mapImg: "/images/maps/explore_pagora_map.jpg",
        text: "햇살에 눈이 부시니?",
        source: "- SNOOPY",
        qrCode: `${BASE_URL}sg_explore_tail_01`,
      },
      {
        type: "location",
        name: "정낭 조쿨",
        hint: "루시의 레모네이드 카페",
        img: "/images/explore_jeongnang.jpg",
        mapImg: "/images/maps/explore_jeongnang_map.jpg",
        text: "조 쿨이 일요일 오후 기숙사에서 한가롭게 시간을 보내고 있는 모습입니다...",
        source: "- SNOOPY",
        qrCode: `${BASE_URL}sg_explore_tail_02`,
      },
      {
        type: "location",
        name: "우드스탁 분수대",
        hint: "푸드트럭",
        img: "/images/explore_fountain.jpg",
        mapImg: "/images/maps/explore_fountain_map.jpg",
        text: "우드스탁의 수영장 파티는 정말 싫다고!",
        source: "- SNOOPY",
        qrCode: `${BASE_URL}sg_explore_tail_04`,
      },
      {
        type: "location",
        name: "래빗",
        hint: "동백원",
        img: "/images/explore_rabbit.jpg",
        mapImg: "/images/maps/explore_rabbit_map.jpg",
        text: "토끼다! 우와 난 토끼 구경하는게 너무 좋아!",
        source: "- SNOOPY",
        qrCode: `${BASE_URL}sg_explore_tail_rabbit`,
      },
      {
        type: "location",
        name: "골퍼 스누피",
        hint: "웜 퍼피 레이크",
        img: "/images/explore_golfer.jpg",
        mapImg: "/images/maps/explore_golfer_map.jpg",
        text: "넌 운이 좋은 줄 알아, 골프화를 안 신어도 되잖아.",
        source: "- CHARLIE BROWN",
        qrCode: `${BASE_URL}sg_explore_tail_05`,
      },
      {
        type: "location",
        name: "스누피 트리하우스",
        hint: "트리하우스",
        img: "/images/explore_cabin.jpg",
        mapImg: "/images/maps/explore_cabin_map.jpg",
        text: "정말 흥분돼, 우리말곤 아무도 못오겠지!",
        source: "- CHARLIE BROWN",
        qrCode: `${BASE_URL}sg_explore_tail_06`,
      },
      {
        type: "location",
        name: "동백원 스누피",
        hint: "애기 동백원",
        img: "/images/explore_camellia.jpg",
        mapImg: "/images/maps/explore_camellia_map.jpg",
        text: "나비들은 날 좋아해!",
        source: "- SNOOPY",
        qrCode: `${BASE_URL}sg_explore_tail_07`,
      },
    ],
  },
  {
    id: "challenge",
    title: "서툴러도 괜찮은 찰리의 하루",
    type: "일상형",
    character: "- CHARLIE BROWN",
    color: "orange",
    completion: {
      title: "찰리의 야구팀 신입 부원",
      dialogues: [
        {
          speaker: "- CHARLIE BROWN",
          text: "나 9회에 홈런을 쳤어, 우리팀이 이겼어! 내가 영웅이 됐다고!!",
        },
      ],
    },
    path: [
      {
        type: "location",
        name: "피너츠 언덕",
        hint: "소설왕 스누피 광장",
        img: "/images/challenge_square.jpg",
        mapImg: "/images/maps/challenge_square_map.jpg",
        text: "넌 구름 속에서 뭐가 보이니, 찰리 브라운",
        source: "- LUCY",
        qrCode: `${BASE_URL}sg_chal_01`,
      },
      {
        type: "location",
        name: "비글 스카우트 텐트",
        hint: "도토리숲",
        img: "/images/challenge_camp.jpg",
        mapImg: "/images/maps/challenge_camp_map.jpg",
        text: "오빠의 멍청한 여자친구들이 또 전화했어.... 캠프가 마음에 안든대.",
        source: "- SALLY BROWN",
        qrCode: `${BASE_URL}sg_chal_03`,
      },
      {
        type: "location",
        name: "이웃 담장",
        hint: "피너츠 사색 들판",
        img: "/images/sentiment_field.jpg",
        mapImg: "/images/maps/sentiment_field_map.jpg",
        text: "정말로 폭풍 가운데로 걸을 때도 두려워할 필요가 없는걸까?",
        source: "- CHARLIE BROWN",
        qrCode: `${BASE_URL}sg_senti_02`,
      },
      {
        type: "location",
        name: "연 먹는 나무",
        hint: "찰리브라운의 야구장",
        img: "/images/challenge_baseball.jpg",
        mapImg: "/images/maps/challenge_baseball_map.jpg",
        text: "이 연은 못가져갈 거야, 이 더러운 연 먹는 나무야!",
        source: "- CHARLIE BROWN",
        qrCode: `${BASE_URL}sg_chal_05`,
      },
      {
        type: "location",
        name: "빨간 머리 소녀의 발렌타인 레드 가든",
        hint: "피너츠 컬러 가든",
        img: "/images/challenge_colorgarden.jpg",
        mapImg: "/images/maps/challenge_colorgarden_map.jpg",
        text: "집에 직접 찾아가서 건네주고 싶지만, 연습을 안하고 가면 너무 긴장할 것 같아서...",
        source: "- CHARLIE BROWN",
        qrCode: `${BASE_URL}sg_chal_06`,
      },
      {
        type: "location",
        name: "둥근 머리 정원",
        hint: "슈로더의 야외무대",
        img: "/images/challenge_roundhead.jpg",
        mapImg: "/images/maps/challenge_roundhead_map.jpg",
        text: "네 머리통처럼 말이야, 찰리브라운! 둥글둥글! 딱 네 머리처럼!",
        source: "- LUCY",
        qrCode: `${BASE_URL}sg_chal_07`,
      },
      {
        type: "location",
        name: "루시의 레모네이드 스탠드",
        hint: "루시의 레모네이드 카페",
        img: "/images/sentiment_cafe.jpg",
        mapImg: "/images/maps/sentiment_cafe_map.jpg",
        text: "너도 알잖아 내가 얼마나 노력했는지! 내가 정말로 노력했다고 말해줘...",
        source: "- CHARLIE BROWN",
        qrCode: `${BASE_URL}sg_senti_05`,
      },
      {
        type: "location",
        name: "찰리브라운의 휴식",
        hint: "하이라인 데크",
        img: "/images/challenge_nest.jpg",
        mapImg: "/images/maps/challenge_nest_map.jpg",
        text: "사람이 무얼 더 바랄 수 있겠어? 얼굴을 간질이는 따뜻한 햇볕... 무릎에 앉은 개... 만족스러움 그 자체지",
        source: "- CHARLIE BROWN",
        qrCode: `${BASE_URL}sg_chal_08`,
      },
      {
        type: "location",
        name: "썸머캠프",
        hint: "웜 퍼피 레이크",
        img: "/images/challenge_lake.jpg",
        mapImg: "/images/maps/challenge_lake_map.jpg",
        text: "여름 내내 아무것도 안하고 뒹굴기만 할 순 없잖아.",
        source: "- CHARLIE BROWN",
        qrCode: `${BASE_URL}sg_chal_09`,
      },
      {
        type: "location",
        name: "후박나무에 위로를 받는 찰리브라운",
        hint: "팽나무길 맞은편",
        img: "/images/challenge_hubaktree.jpg",
        mapImg: "/images/maps/challenge_hubaktree_map.jpg",
        text: "난 새로운 철학을 만들어냈어. 한번에 하루씩만 두려워하기로 말이야!",
        source: "- CHARLIE BROWN",
        qrCode: `${BASE_URL}sg_chal_11`,
      },
    ],
  },
];

// 로컬 스토리지 키 값 설정
const STORAGE_KEY_STATE = "sgq_ultimate_stable_state";

const getInitialState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STATE);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 🔥 안정화 로직: 로컬 스토리지 데이터 무결성 검증
      if (parsed && typeof parsed === "object") {
        if (
          parsed.activeThemeId &&
          !themeData.find((t) => t.id === parsed.activeThemeId)
        ) {
          return null; // 데이터가 오염되었으면 초기화
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load state", e);
  }
  return null;
};

export default function App() {
  const initialState = getInitialState();

  const [step, setStep] = useState(initialState?.step || "splash");
  const [activeThemeId, setActiveThemeId] = useState(
    initialState?.activeThemeId || null
  );
  const [activePath, setActivePath] = useState(initialState?.activePath || []);
  const [progress, setProgress] = useState(initialState?.progress || 0);
  const [completedThemes, setCompletedThemes] = useState(
    initialState?.completedThemes || []
  );
  const [themeStates, setThemeStates] = useState(
    initialState?.themeStates || {}
  );
  const [justGotGrandClear, setJustGotGrandClear] = useState(false);

  const [qrErrorMsg, setQrErrorMsg] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);

  const [zoomedImage, setZoomedImage] = useState(null);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [scanFailCount, setScanFailCount] = useState(0);

  const activeTheme = themeData.find((t) => t.id === activeThemeId) || null;
  const isUrlProcessed = useRef(false);

  // 🔥 [핵심 안정화] 상태 이상 감지 및 복구
  useEffect(() => {
    if (["journey", "scene", "complete"].includes(step)) {
      if (!activeTheme || activePath.length === 0) {
        console.warn("Invalid State Detected! Resetting to Intro...");
        setStep("intro");
      }
    }
  }, [step, activeTheme, activePath]);

  // 상태 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    if (step === "splash" && !initialState) return;

    const stateToSave = {
      step,
      activeThemeId,
      activePath,
      progress,
      completedThemes,
      themeStates,
    };
    localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(stateToSave));
  }, [step, activeThemeId, activePath, progress, completedThemes, themeStates]);

  // =====================================================================
  // 📊 구글 태그 매니저(GTM) 동적 스크립트 및 dataLayer 삽입
  // =====================================================================
  useEffect(() => {
    if (!GTM_CONTAINER_ID || GTM_CONTAINER_ID === "GTM-5LKS6MB7") {
      console.warn("GTM 컨테이너 ID가 비어있거나 올바르지 않습니다.");
      return;
    }

    // 1. dataLayer 초기화
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      "gtm.start": new Date().getTime(),
      event: "gtm.js",
    });

    // 2. GTM head 스크립트 태그 동적 삽입
    const scriptId = "gtm-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
      document.head.appendChild(script);
    }

    // 3. GTM body (noscript) iframe 동적 삽입
    const noscriptId = "gtm-noscript";
    if (!document.getElementById(noscriptId)) {
      const noscript = document.createElement("noscript");
      noscript.id = noscriptId;
      noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
      document.body.insertBefore(noscript, document.body.firstChild);
    }
  }, []);

  // =====================================================================
  // 📊 GTM 화면 노출형 이벤트 (view_story, view_map, complete_course) 및 가상 페이지뷰 수집
  // =====================================================================
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.dataLayer = window.dataLayer || [];

    // 기본 가상 페이지뷰
    window.dataLayer.push({
      event: "virtual_page_view",
      page_title: `Quest_Step_${step}`,
      page_path: `/${step}`,
    });

    if (!activeTheme) return;

    if (step === "scene") {
      // 📊 4. 스토리 팝업 노출 — view_story
      window.dataLayer.push({
        event: "view_story",
        story_name: activeTheme.title,
        spot_name: activePath[progress]?.name || "",
      });
    } else if (step === "journey") {
      // 📊 6. 리스트 화면 노출 — view_map
      window.dataLayer.push({
        event: "view_map",
        story_name: activeTheme.title,
      });
    } else if (step === "complete") {
      // 📊 9. 코스 완주 — complete_course
      window.dataLayer.push({
        event: "complete_course",
        story_name: activeTheme.title,
      });
    }
  }, [step, activeThemeId, progress]);

  // =====================================================================
  // 🔗 [핵심 안정화] URL 파라미터를 통한 외부 카메라 스캔 자동 연동 로직
  // =====================================================================
  useEffect(() => {
    if (isUrlProcessed.current) return;

    const params = new URLSearchParams(window.location.search);
    const qrFromUrl = params.get("key");

    if (qrFromUrl) {
      window.history.replaceState({}, document.title, window.location.pathname);
      isUrlProcessed.current = true;

      if (activePath.length > 0 && progress < activePath.length) {
        const currentExpectedQR = activePath[progress]?.qrCode;
        const rawExpectedId = currentExpectedQR
          ? currentExpectedQR.split("?key=")[1]
          : null;

        if (
          rawExpectedId &&
          (qrFromUrl === rawExpectedId || qrFromUrl === "snoopy_master")
        ) {
          // 📊 3. QR 인증 완료 — scan_qrcode 이벤트 전송 (URL 파라미터 유입)
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: "scan_qrcode",
            qrcode_id: qrFromUrl,
            story_name: activeTheme?.title || "",
            spot_name: activePath[progress]?.name || "",
          });

          setQrErrorMsg("");
          setScanFailCount(0);
          setStep("scene");
        } else {
          setStep("qr");
          setQrErrorMsg(
            "앗! 현재 위치의\n정답 QR코드가 아닌 것 같아요! 🐶\n(위치를 다시 확인해주세요)"
          );
        }
      } else {
        setStep("intro");
        setTimeout(() => {
          alert("새로운 퀘스트 테마를 먼저 선택해주세요! 🏕️");
        }, 500);
      }
    }
  }, [activePath, progress]);

  const handleStartTheme = (theme) => {
    setActiveThemeId(theme.id);

    if (themeStates[theme.id]) {
      setActivePath(themeStates[theme.id].path);
      setProgress(themeStates[theme.id].progress);

      if (themeStates[theme.id].progress >= themeStates[theme.id].path.length) {
        setStep("complete");
      } else {
        setStep("journey");
      }
    } else {
      setActivePath([...theme.path]);
      setProgress(0);
      setStep("journey");
    }
  };

  const handleScanQR = () => {
    setQrErrorMsg("");
    setScanFailCount(0);
    setStep("qr");
  };

  const handleQRSuccess = (scannedData) => {
    const currentExpectedQR = activePath[progress]?.qrCode;
    const rawExpectedId = currentExpectedQR
      ? currentExpectedQR.split("?key=")[1]
      : "";

    if (
      (rawExpectedId && scannedData.includes(rawExpectedId)) ||
      scannedData.includes("snoopy_master") ||
      scanFailCount >= 3
    ) {
      const qrcodeId = scannedData.includes("?key=")
        ? scannedData.split("?key=")[1]
        : scannedData || (scanFailCount >= 3 ? "bypass_by_fail" : "");

      // 📊 3. QR 인증 완료 — scan_qrcode 이벤트 전송
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "scan_qrcode",
        qrcode_id: qrcodeId,
        story_name: activeTheme?.title || "",
        spot_name: activePath[progress]?.name || "",
      });

      setQrErrorMsg("");
      setScanFailCount(0);
      setStep("scene");
    } else {
      const newCount = scanFailCount + 1;
      setScanFailCount(newCount);

      setQrErrorMsg(
        "앗! 현재 위치의\n정답 QR코드가 아닌 것 같아요! 🐶\n(위치를 다시 확인해주세요)"
      );

      setTimeout(() => {
        setQrErrorMsg("");
      }, 3500);
    }
  };

  const handleGetStamp = (e) => {
    if (e) e.preventDefault();
    const nextProgress = progress + 1;

    setThemeStates((prev) => ({
      ...prev,
      [activeThemeId]: { progress: nextProgress, path: activePath },
    }));

    if (nextProgress >= activePath.length) {
      let newCompleted = [...completedThemes];
      if (!newCompleted.includes(activeTheme.id)) {
        newCompleted.push(activeTheme.id);
        setCompletedThemes(newCompleted);
      }

      if (
        newCompleted.length === themeData.length &&
        !completedThemes.includes(activeTheme.id)
      ) {
        setJustGotGrandClear(true);
      } else {
        setJustGotGrandClear(false);
      }
      setStep("complete");
      setShowSurveyModal(true);
    } else {
      setProgress(nextProgress);
      setStep("journey");
    }
  };

  const handleMakeChoice = (routeToInsert) => {
    const newPath = [...activePath];
    newPath.splice(progress, 1, ...routeToInsert);
    setActivePath(newPath);

    setThemeStates((prev) => ({
      ...prev,
      [activeThemeId]: { progress: progress, path: newPath },
    }));
  };

  const resetQuest = () => {
    setActiveThemeId(null);
    setStep("intro");
  };

  const handleResetConfirm = () => {
    localStorage.removeItem(STORAGE_KEY_STATE);
    setActiveThemeId(null);
    setActivePath([]);
    setProgress(0);
    setCompletedThemes([]);
    setThemeStates({});
    setShowResetModal(false);
    setStep("splash");
  };

  const renderConfetti = () => {
    const colors = [
      "bg-red-400",
      "bg-blue-400",
      "bg-yellow-400",
      "bg-emerald-400",
      "bg-purple-400",
      "bg-pink-400",
    ];
    return Array.from({ length: 40 }).map((_, i) => (
      <div
        key={i}
        className={`confetti absolute rounded-full ${
          colors[Math.floor(Math.random() * colors.length)]
        }`}
        style={{
          left: `${Math.random() * 100}%`,
          top: `-${Math.random() * 20}px`,
          width: `${Math.random() * 6 + 6}px`,
          height: `${Math.random() * 12 + 6}px`,
          animation: `fall ${Math.random() * 2 + 2.5}s linear ${
            Math.random() * 2
          }s infinite`,
        }}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans text-stone-800 relative">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden relative flex flex-col h-[750px] max-h-[100dvh]">
        {zoomedImage && (
          <div
            className="absolute inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in touch-none flex-col"
            onClick={() => setZoomedImage(null)}
          >
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-6 right-6 bg-white/10 text-white rounded-full p-2 z-10 hover:bg-white/30 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-full h-full flex items-center justify-center p-2 overflow-auto">
              <img
                src={zoomedImage}
                alt="확대된 전체화면 이미지"
                className="w-full h-auto max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <p className="absolute bottom-8 text-white/50 text-[11px] font-bold tracking-widest bg-black/50 px-4 py-2 rounded-full">
              화면을 터치하면 닫힙니다
            </p>
          </div>
        )}

        {showResetModal && (
          <div className="absolute inset-0 z-50 bg-stone-900/60 flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-stone-800 mb-2">
                초기화 경고
              </h3>
              <p className="text-sm text-stone-500 mb-6 break-keep leading-relaxed">
                모든 퀘스트 진행 상황과 모은 코스 완료 사항이 삭제됩니다.
                <br />
                정말 처음부터 다시 시작하시겠습니까?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleResetConfirm}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>
        )}

        {showHintModal && (
          <div className="absolute inset-0 z-50 bg-stone-900/80 flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white rounded-3xl overflow-hidden w-full max-w-sm shadow-2xl relative flex flex-col max-h-[85vh]">
              <button
                onClick={() => setShowHintModal(false)}
                className="absolute top-4 right-4 bg-stone-900/60 text-white rounded-full p-1.5 z-20 hover:bg-stone-800 transition-colors shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div
                  className="w-full h-56 bg-stone-100 relative flex flex-col items-center justify-center shrink-0 cursor-pointer group"
                  onClick={() => {
                    if (activePath[progress]?.img) {
                      // 📊 1. 힌트 확인 — click_story_hint 이벤트 전송
                      window.dataLayer = window.dataLayer || [];
                      window.dataLayer.push({
                        event: "click_story_hint",
                        story_name: activeTheme?.title || "",
                        spot_name: activePath[progress]?.name || "",
                      });
                      setZoomedImage(activePath[progress].img);
                    }
                  }}
                >
                  {activePath[progress]?.img ? (
                    <>
                      <img
                        src={activePath[progress].img}
                        alt="장소 설명 이미지"
                        className="w-full h-full object-cover absolute inset-0 z-10 transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <div className="absolute bottom-3 right-3 bg-stone-900/70 text-white px-2.5 py-1.5 rounded-lg z-20 flex items-center gap-1.5 backdrop-blur-sm shadow-md">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">확대</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-stone-400 opacity-60 relative z-0">
                      <ImageIcon className="w-12 h-12 mb-2" />
                      <span className="text-xs">힌트 사진 준비 중</span>
                    </div>
                  )}
                </div>

                <div className="p-6 text-center bg-white flex flex-col items-center shrink-0">
                  <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold mb-3">
                    <MapPin className="w-3 h-3" /> HINT
                  </div>
                  <p className="text-lg font-bold text-stone-800 break-keep leading-tight mb-6">
                    {activePath[progress]?.hint || "장소를 찾아주세요"}
                  </p>

                  <div
                    className="w-full aspect-[300/260] bg-stone-50 rounded-xl overflow-hidden relative border border-stone-200 flex items-center justify-center shadow-inner cursor-pointer group"
                    onClick={() => {
                      if (activePath[progress]?.mapImg) {
                        // GTM 이미지 클릭 이벤트 수집
                        window.dataLayer = window.dataLayer || [];
                        window.dataLayer.push({
                          event: "click_image_area",
                          image_type: "map",
                          location_name: activePath[progress]?.name,
                        });
                        setZoomedImage(activePath[progress].mapImg);
                      }
                    }}
                  >
                    {activePath[progress]?.mapImg ? (
                      <>
                        <img
                          src={activePath[progress].mapImg}
                          alt="지도 이미지"
                          className="w-full h-full object-contain absolute inset-0 z-10 p-2 transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <div className="absolute bottom-2 right-2 bg-stone-900/70 text-white px-2 py-1.5 rounded-lg z-20 flex items-center gap-1.5 backdrop-blur-sm shadow-md">
                          <ZoomIn className="w-3 h-3" />
                          <span className="text-[10px] font-bold">확대</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-stone-400 opacity-60 relative z-0">
                        <Map className="w-8 h-8 mb-2" />
                        <span className="text-[11px] font-bold">
                          상세 위치 지도 준비 중
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowHintModal(false)}
                className="w-full bg-stone-100 text-stone-600 font-bold py-4 hover:bg-stone-200 transition-colors border-t border-stone-200 shrink-0"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {showSurveyModal && (
          <div className="absolute inset-0 z-50 bg-stone-900/60 flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl relative">
              <button
                onClick={() => setShowSurveyModal(false)}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>

              <h3 className="text-xl font-black text-stone-800 mb-2">
                코스 완주를 축하합니다! 🎉
              </h3>
              <p className="text-sm text-stone-500 mb-6 break-keep leading-relaxed">
                더 나은 탐험을 위해
                <br />
                짧은 설문조사에 참여해 주시겠어요?
                <br />
                <span className="block mt-3 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-bold text-xs">
                  🎁 설문 완료 페이지를 매표소에 보여주시면
                  <br />
                  소정의 리워드를 증정해 드립니다!
                </span>
              </p>

              <div className="flex flex-col gap-3">
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSdfwEIIIGQ6eBFjstuBj_VtoGHswevq1qy3gF-ndveDdg0rhw/viewform?usp=publish-editor"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowSurveyModal(false)}
                  className="w-full py-3.5 rounded-xl font-black bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  설문조사 참여하기
                </a>
                <button
                  type="button"
                  onClick={() => setShowSurveyModal(false)}
                  className="w-full py-3.5 rounded-xl font-bold bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors"
                >
                  나중에 하기
                </button>
              </div>
            </div>
          </div>
        )}

        {step !== "splash" && step !== "qr" && (
          <div className="bg-stone-900 p-4 text-center text-white relative flex justify-between items-center z-10 shrink-0">
            <h1 className="text-lg font-bold tracking-tighter">가든 퀘스트</h1>
            {activeTheme && step !== "intro" && step !== "grandClear" && (
              <button
                type="button"
                onClick={resetQuest}
                className="text-[10px] text-stone-400 border border-stone-700 px-2 py-1 rounded hover:bg-stone-800 transition"
              >
                EXIT
              </button>
            )}
            {!activeTheme && step === "intro" && (
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-[10px] text-stone-400 border border-stone-700 px-2 py-1 rounded hover:bg-stone-800 transition"
              >
                초기화
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-hidden bg-stone-50 flex flex-col relative">
          {step === "splash" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden bg-stone-900">
              <img
                src="/images/explore_square.jpg"
                alt="소설왕 스누피 광장 배경"
                className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent"></div>
              <div className="z-10 flex flex-col items-center justify-center text-center px-6 w-full h-full animate-fade-in">
                <h1
                  className="text-5xl font-black tracking-tighter mb-3 text-white drop-shadow-2xl"
                  style={{ textShadow: "0px 4px 16px rgba(0,0,0,0.9)" }}
                >
                  가든 퀘스트
                </h1>
                <p className="text-emerald-300 text-xs tracking-[0.4em] mb-12 uppercase font-bold drop-shadow-md">
                  자연 속 위대한 모험의 시작
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await requestCameraPermissionOnce();
                    setStep("intro");
                  }}
                  className="group relative w-full max-w-[260px] bg-emerald-600 text-white font-black py-5 rounded-full shadow-[0_10px_40px_rgba(16,185,129,0.4)] hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-2 overflow-hidden border border-emerald-400"
                >
                  <span className="relative z-10 tracking-widest text-base">
                    탐험 시작하기
                  </span>
                  <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {step === "intro" && (
            <div className="p-6 animate-fade-in pb-12 flex-1 overflow-y-auto custom-scrollbar">
              {completedThemes.length === themeData.length ? (
                <div
                  onClick={() => setStep("grandClear")}
                  className="mb-6 bg-gradient-to-r from-yellow-100 via-yellow-50 to-yellow-100 rounded-2xl p-5 border border-yellow-300 shadow-md text-center relative overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                >
                  <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-20">
                    <Award className="w-24 h-24 text-yellow-500" />
                  </div>
                  <Award className="w-8 h-8 text-yellow-600 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs font-bold text-yellow-700 uppercase tracking-widest mb-1">
                    Official Beagle Scout
                  </p>
                  <p className="text-sm font-bold text-yellow-900 leading-relaxed break-keep">
                    가든의 모든 미션을 완수했습니다!
                    <br />
                    배너를 터치하여 리워드를 다시 확인하세요!
                  </p>
                </div>
              ) : (
                <div className="mb-6 bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-start gap-3 shadow-sm">
                  <Quote className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-bold text-emerald-900 leading-relaxed italic">
                      "여행은 사람을 성장시킨다."
                    </p>
                    <span className="text-[10px] font-normal text-emerald-600 mt-2 block">
                      - CHARLIE BROWN
                    </span>
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <div className="flex justify-center items-center gap-2 mb-2">
                  <div
                    className={`flex items-center gap-1 font-bold text-[10px] px-3 py-1 rounded-full border shadow-sm transition-colors
                    ${
                      completedThemes.length === themeData.length
                        ? "bg-yellow-100 border-yellow-300 text-yellow-700"
                        : "bg-emerald-100 border-emerald-200 text-emerald-600"
                    }`}
                  >
                    <Award className="w-3 h-3" /> 코스 완주{" "}
                    {completedThemes.length}/{themeData.length}
                  </div>
                </div>
                <h2 className="text-2xl font-black text-stone-800 leading-tight">
                  어떤 피너츠 친구들의
                  <br />
                  이야기를 함께하고 싶나요?
                </h2>
              </div>

              <div className="space-y-3">
                {themeData.map((theme) => {
                  const isCompleted = completedThemes.includes(theme.id);
                  return (
                    <button
                      type="button"
                      key={theme.id}
                      onClick={() => handleStartTheme(theme)}
                      className={`w-full text-left bg-white rounded-2xl p-5 border-2 shadow-sm transition-all relative overflow-hidden
                        ${
                          isCompleted
                            ? "border-emerald-300 bg-emerald-50/50"
                            : "border-stone-100 hover:border-stone-800"
                        }`}
                    >
                      <div className="flex justify-between items-start relative z-10">
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-1
                            ${
                              isCompleted
                                ? "bg-emerald-200 text-emerald-800"
                                : "bg-stone-200 text-stone-600"
                            }`}
                          >
                            {theme.type}
                          </span>
                          <h3
                            className={`font-bold text-lg leading-tight ${
                              isCompleted
                                ? "text-emerald-900"
                                : "text-stone-900"
                            }`}
                          >
                            {theme.title}
                          </h3>
                          <p className="text-[10px] text-stone-400 mt-1">
                            {theme.character}
                          </p>
                        </div>
                        {isCompleted && (
                          <CheckCircle className="text-emerald-500 w-6 h-6" />
                        )}
                      </div>
                    </button>
                  );
                })}

                {completedThemes.length > 0 && (
                  <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLSdfwEIIIGQ6eBFjstuBj_VtoGHswevq1qy3gF-ndveDdg0rhw/viewform?usp=publish-editor"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold py-4 rounded-2xl border border-emerald-300 shadow-sm transition-all mt-6"
                  >
                    <span className="flex items-center justify-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4" /> 만족도 설문조사 참여하기
                    </span>
                    <span className="text-[11px] font-medium text-emerald-600 block">
                      🎁 매표소에 완료 화면 제시 시 소정의 리워드 증정
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}

          {step === "journey" && activeTheme && (
            <div className="p-6 animate-fade-in flex flex-col flex-1 h-full overflow-hidden">
              <div className="mb-4 shrink-0">
                <span className="px-3 py-1 bg-stone-200 text-stone-700 rounded-full text-xs font-bold mb-1 inline-block">
                  {activeTheme.type}
                </span>
                <h2 className="text-xl font-black">{activeTheme.title}</h2>
              </div>

              <div className="flex-1 bg-white rounded-2xl p-5 border border-stone-200 shadow-sm overflow-y-auto custom-scrollbar mb-4">
                <div className="relative pl-10 space-y-6 pr-2">
                  <div className="absolute top-2 bottom-4 left-[21px] w-0.5 bg-stone-200"></div>
                  {activePath.map((loc, idx) => {
                    const isCompleted = idx < progress;
                    const isCurrent = idx === progress;
                    const isFuture = idx > progress;
                    const isChoice = loc.type === "choice";
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (!isFuture) {
                            // 📊 7. 지도 리스트 클릭 — click_map_spot 이벤트 전송
                            window.dataLayer = window.dataLayer || [];
                            window.dataLayer.push({
                              event: "click_map_spot",
                              story_name: activeTheme?.title || "",
                              spot_name: loc?.name || "",
                            });
                          }
                        }}
                        className={`relative flex items-start gap-4 ${
                          isFuture ? "opacity-30" : "opacity-100"
                        } transition-opacity cursor-pointer`}
                      >
                        <div
                          className={`absolute -left-[31px] w-6 h-6 rounded-full flex items-center justify-center z-10 border-2 bg-white
                          ${
                            isCompleted
                              ? "border-emerald-500 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                              : isCurrent && isChoice
                              ? "border-blue-500 text-blue-500 bg-blue-50"
                              : isCurrent
                              ? "border-stone-800 text-stone-800 animate-bounce"
                              : "border-stone-300"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 fill-current text-white" />
                          ) : isChoice && !isFuture ? (
                            <GitBranch className="w-3 h-3" />
                          ) : isCurrent ? (
                            <Footprints className="w-3 h-3" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-stone-300"></div>
                          )}
                        </div>
                        <div
                          className={`flex-1 ${
                            isCurrent
                              ? "bg-stone-50 p-3 rounded-lg border border-stone-200 -mt-2"
                              : ""
                          }`}
                        >
                          <p
                            className={`font-bold ${
                              isCurrent
                                ? "text-stone-900 text-base"
                                : "text-stone-500 text-sm"
                            }`}
                          >
                            {isFuture ? "???" : loc?.name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="shrink-0">
                {activePath[progress]?.type === "choice" ? (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-md">
                    <p className="text-center font-bold text-blue-900 mb-4 text-sm">
                      {activePath[progress].title}
                    </p>
                    <div className="flex flex-col gap-2">
                      {activePath[progress].options.map((opt, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => handleMakeChoice(opt.route)}
                          className="bg-white border border-blue-200 text-left p-4 rounded-xl flex items-center justify-between text-xs font-bold hover:border-blue-500 transition-all shadow-sm group"
                        >
                          <div className="flex-1">
                            <span className="text-blue-900 group-hover:text-blue-600">
                              {opt.label}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-blue-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      // 📊 8. QR 스캔 클릭 — click_map_qrcode 이벤트 전송
                      window.dataLayer = window.dataLayer || [];
                      window.dataLayer.push({
                        event: "click_map_qrcode",
                        story_name: activeTheme?.title || "",
                        spot_name: activePath[progress]?.name || "",
                      });
                      handleScanQR();
                    }}
                    className="w-full bg-stone-900 text-white font-bold py-5 rounded-2xl shadow-xl tracking-widest text-sm hover:bg-stone-800 transition"
                  >
                    [{activePath[progress]?.name || "목적지"}] 도착 후 QR 스캔
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "qr" && (
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center bg-stone-900 text-white h-full relative animate-fade-in">
              {qrErrorMsg && (
                <div className="absolute top-10 left-6 right-6 z-30 animate-fade-in">
                  <div className="bg-red-500 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-center gap-2 border-2 border-red-400">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <p className="text-sm font-bold break-keep text-left leading-tight whitespace-pre-line">
                      {qrErrorMsg}
                    </p>
                  </div>
                </div>
              )}
              <div className="mb-6 z-10 shrink-0 mt-4 flex flex-col items-center">
                <h2 className="text-xl font-bold mb-3">SCAN QR CODE</h2>
                <button
                  onClick={() => {
                    // 📊 1. 힌트 확인 — click_story_hint 이벤트 전송
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({
                      event: "click_story_hint",
                      story_name: activeTheme?.title || "",
                      spot_name: activePath[progress]?.name || "",
                    });
                    setShowHintModal(true);
                  }}
                  className="text-emerald-400 text-sm font-bold bg-stone-800 px-6 py-2.5 rounded-full inline-flex items-center gap-2 border border-stone-700 hover:bg-stone-700 transition-colors shadow-md"
                >
                  <MapPin className="w-4 h-4" /> 힌트 확인하기
                </button>
              </div>

              <div
                className={`w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden mb-8 border-2 border-stone-600 shadow-[0_0_60px_rgba(16,185,129,0.15)] relative shrink-0
                ${
                  qrErrorMsg
                    ? "border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.3)]"
                    : "border-stone-600 hover:border-emerald-500"
                }`}
              >
                <QRScanner
                  onScan={(result) => {
                    if (result) {
                      handleQRSuccess(result);
                    }
                  }}
                  onError={(error) => {
                    console.error("Camera Error:", error);
                  }}
                />
                <div className="absolute inset-0 pointer-events-none border-[30px] border-stone-900/60 flex items-center justify-center z-10 rounded-3xl">
                  <ScanLine
                    className={`w-16 h-16 ${
                      qrErrorMsg ? "text-red-400" : "text-emerald-400"
                    } animate-pulse`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full z-10 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    // 📊 2. 지도로 돌아가기 — click_story_map 이벤트 전송
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({
                      event: "click_story_map",
                      story_name: activeTheme?.title || "",
                      spot_name: activePath[progress]?.name || "",
                    });
                    setStep("journey");
                  }}
                  className="w-full bg-transparent border border-stone-700 text-stone-400 font-bold py-4 rounded-2xl text-sm hover:bg-stone-800 hover:text-white transition-colors"
                >
                  지도 화면으로 돌아가기
                </button>
              </div>
            </div>
          )}

          {step === "scene" && (
            <div className="p-6 flex-1 flex flex-col animate-fade-in h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-2">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200 mb-6">
                  <span className="font-bold text-emerald-600 text-[10px] flex items-center gap-1 mb-4 uppercase tracking-wider">
                    <MapPin className="w-3 h-3" />{" "}
                    {activePath[progress]?.name || "목적지"}
                  </span>
                  <div className="w-full h-48 bg-stone-100 rounded-xl mb-5 overflow-hidden relative border border-stone-200 flex items-center justify-center">
                    {activePath[progress]?.img ? (
                      <img
                        src={activePath[progress].img}
                        alt="장소 이미지"
                        className="w-full h-full object-cover absolute inset-0 z-10"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : null}
                    <div className="flex flex-col items-center text-stone-400 relative z-0 opacity-60">
                      <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
                      <span className="text-xs font-medium">
                        사진 이미지 준비 중
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-start gap-3 shadow-sm">
                    <Quote className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-emerald-900 font-bold text-sm leading-relaxed break-keep">
                        "
                        {activePath[progress]?.text ||
                          "위대한 탐험의 순간입니다!"}
                        "
                      </p>
                      {activePath[progress]?.source && (
                        <span className="text-[10px] font-normal text-emerald-600 mt-2 block">
                          {activePath[progress]?.source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    // 📊 5. 다음 이야기 클릭 — click_next_story 이벤트 전송
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({
                      event: "click_next_story",
                      story_name: activeTheme?.title || "",
                      spot_name: activePath[progress]?.name || "",
                    });
                    handleGetStamp(e);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-lg text-sm tracking-widest transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  다음 이야기 찾기! <Star className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === "complete" && activeTheme && (
            <div className="p-6 flex-1 flex flex-col items-center justify-center animate-fade-in h-full overflow-y-auto custom-scrollbar">
              <div className="w-28 h-28 bg-emerald-100 rounded-full flex items-center justify-center mb-8 relative shadow-inner shrink-0">
                <CheckCircle className="w-16 h-16 text-emerald-600" />
                <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-1 rounded-full rotate-12 shadow-md">
                  QUEST CLEAR!
                </div>
              </div>
              <h2 className="text-2xl font-black text-stone-800 mb-2 shrink-0">
                코스 완주 성공!
              </h2>

              <div className="w-full bg-white rounded-2xl border border-stone-200 p-5 mb-10 text-left shadow-sm shrink-0">
                <p className="text-center text-[10px] font-black text-stone-400 mb-5 border-b pb-3 uppercase tracking-[0.2em]">
                  {activeTheme.completion?.title}
                </p>
                <div className="space-y-4">
                  {activeTheme.completion?.dialogues?.map((dialogue, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        idx % 2 !== 0 ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`p-4 rounded-2xl text-[13px] font-medium inline-block max-w-[85%] shadow-sm ${
                          idx % 2 === 0
                            ? "bg-stone-100 text-stone-800 rounded-tl-none"
                            : "bg-emerald-50 text-emerald-900 rounded-tr-none"
                        }`}
                      >
                        "{dialogue.text}"
                      </div>
                      {dialogue.speaker && (
                        <span className="text-[10px] font-bold text-stone-400 mt-1.5 px-1">
                          {dialogue.speaker}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {completedThemes.length === themeData.length ? (
                <button
                  type="button"
                  onClick={() => setStep("grandClear")}
                  className="w-full shrink-0 flex flex-col items-center justify-center gap-1 bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-black py-4 px-2 rounded-2xl tracking-wider text-[13px] sm:text-sm shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-bounce transition-colors mt-4 break-keep leading-relaxed"
                >
                  <span>✨ 비글스카우트 대장 스누피가</span>
                  <span>당신을 찾고 있어요! ✨</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resetQuest}
                  className="w-full shrink-0 bg-stone-900 hover:bg-stone-800 text-white font-black py-5 rounded-2xl tracking-widest text-sm shadow-xl transition-colors"
                >
                  BACK TO LIST
                </button>
              )}
            </div>
          )}

          {step === "grandClear" && (
            <div className="p-6 flex-1 flex flex-col items-center animate-fade-in h-full bg-stone-900 text-white overflow-y-auto overflow-x-hidden relative custom-scrollbar">
              {renderConfetti()}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-stone-900 to-stone-900 z-0 pointer-events-none"></div>

              <div className="z-10 flex flex-col items-center w-full text-center my-auto py-8">
                <div className="relative mb-6 flex justify-center mt-4">
                  <div className="absolute inset-0 bg-yellow-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <Sparkles className="w-32 h-32 text-yellow-400 absolute -top-6 -right-6 animate-spin-slow" />
                  <div className="bg-gradient-to-b from-yellow-300 to-yellow-600 rounded-full p-2 relative z-10 shadow-[0_0_20px_rgba(234,179,8,0.8)]">
                    <div className="bg-stone-900 rounded-full p-6 border-2 border-yellow-400 border-dashed">
                      <Award className="w-16 h-16 text-yellow-400" />
                    </div>
                  </div>
                  <div className="absolute -bottom-3 flex justify-center w-full z-20">
                    <span className="bg-yellow-500 text-yellow-900 font-black px-4 py-1 rounded-full text-[10px] shadow-lg border-2 border-yellow-200">
                      GRAND MASTER
                    </span>
                  </div>
                </div>

                <span className="text-yellow-400 font-black tracking-[0.3em] text-xs mb-1 mt-4">
                  BEAGLE SCOUT
                </span>
                <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">
                  명예 대원 임명!
                </h2>
                <p className="text-yellow-100 text-sm mb-6 font-medium break-keep px-4 opacity-90">
                  가든의 모든 퀘스트를 완수한 당신을
                  <br />
                  <span className="text-yellow-400 font-bold">
                    일급 비글 스카우트 대원
                  </span>
                  으로 임명합니다!
                </p>

                <div className="w-full bg-stone-800/80 backdrop-blur-sm border border-yellow-500/30 rounded-3xl p-5 mb-8 shadow-[0_0_30px_rgba(234,179,8,0.15)] relative">
                  <div className="mb-6 bg-stone-900/50 rounded-xl p-4 border border-yellow-500/20 flex items-start gap-3 shadow-sm text-left">
                    <Quote className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-yellow-55 leading-relaxed italic">
                        "숲속 하이킹은 즐거움과 영감을 줄 수 있습니다."
                      </p>
                      <span className="text-[10px] font-normal text-yellow-600 mt-2 block">
                        - SNOOPY
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-left">
                    <div className="bg-stone-800 p-4 rounded-xl border border-stone-700 flex items-start gap-3 shadow-sm">
                      <Quote className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-stone-200 font-bold text-[13px] leading-relaxed break-keep">
                          "우리가 이렇게 진심인데 어떻게 질 수 있겠어?"
                        </p>
                        <span className="block text-[10px] font-normal text-stone-500 mt-2">
                          - CHARLIE BROWN
                        </span>
                      </div>
                    </div>
                    <div className="bg-stone-800 p-4 rounded-xl border border-stone-700 flex items-start gap-3 shadow-sm">
                      <Quote className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-stone-200 font-bold text-[13px] leading-relaxed break-keep">
                          "이건 내 인생이고, 난 내 마음대로 할 거야!"
                        </p>
                        <span className="block text-[10px] font-normal text-stone-500 mt-2">
                          - LUCY
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetQuest}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-black py-5 rounded-2xl tracking-widest text-sm shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-colors mt-4"
                >
                  메인 화면으로 돌아가기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fall {
          from { transform: translateY(-100vh) rotate(0deg); }
          to { transform: translateY(100vh) rotate(360deg); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f5f5f4;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d6d3d1;
          border-radius: 4px;
        }
      `,
        }}
      />
    </div>
  );
}
