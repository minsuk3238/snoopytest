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
} from "lucide-react";

// =====================================================================
// 🔑 [중요] 마스터 코드 설정 (모든 장소 통과 가능)
// =====================================================================
const BASE_URL = "https://snoopytest-mu.vercel.app/?key=";
const MASTER_QR_CODE = `${BASE_URL}snoopy_master`;

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
    <div className="w-full h-full relative bg-stone-900 flex items-center justify-center overflow-hidden">
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

// === [코스 1: 탐험형 공통 후반부 합류 동선 - 8곳] ===
const exploreTail = [
  {
    type: "location",
    name: "스누피 파고라",
    hint: "스누피 페르소나 암석원",
    img: "/images/explore_pagora.jpg",
    text: "갑자기 아래쪽을 가로질러 빠르게 움직이는 그림자가 보인다. 성난 굉음이 허공을 채운다!",
    source: "- SNOOPY ",
    qrCode: `${BASE_URL}sg_explore_tail_01`,
  },
  {
    type: "location",
    name: "엽란 스누피",
    hint: "라이너스의 담요 숲",
    img: "/images/explore_yeobran.jpg",
    text: "또 일주일이 지났는데 아직도 풀을 안깎다니! 이러단 곧 내 눈앞이 다 가려지겠어!",
    source: "- SNOOPY ",
    qrCode: `${BASE_URL}sg_explore_tail_03`,
  },
  {
    type: "location",
    name: "정낭 조쿨",
    hint: "루시의 레모네이드 카페",
    img: "/images/explore_jeongnang.jpg",
    text: "휴 조 쿨은 일요일 오후를 싫어해.",
    source: "- SNOOPY ",
    qrCode: `${BASE_URL}sg_explore_tail_02`,
  },
  {
    type: "location",
    name: "우드스탁 분수대",
    hint: "야자원",
    img: "/images/explore_fountain.jpg",
    text: "우드스탁의 수영장 파티는 정말 싫다고!",
    source: "- SNOOPY ",
    qrCode: `${BASE_URL}sg_explore_tail_04`,
  },
  {
    type: "location",
    name: "토끼와 스누피",
    hint: "야자원 토끼 조형물",
    img: "/images/explore_rabbit.jpg",
    text: "토끼다! 우와 난 토끼 구경하는게 너무 좋아!",
    source: "- SNOOPY ",
    qrCode: `${BASE_URL}sg_explore_tail_rabbit`,
  },
  {
    type: "location",
    name: "골퍼 스누피",
    hint: "웜 퍼피 레이크",
    img: "/images/explore_golfer.jpg",
    text: "넌 운이 좋은 줄 알아, 골프화를 안 신어도 되잖아.",
    source: "-  CHARIE BROWN",
    qrCode: `${BASE_URL}sg_explore_tail_05`,
  },
  {
    type: "location",
    name: "트리하우스 스누피",
    hint: "트리하우스",
    img: "/images/explore_cabin.jpg",
    text: "난 시키지 않으면 절대 아무것도 안하거든!",
    source: "- SNOOPY ",
    qrCode: `${BASE_URL}sg_explore_tail_06`,
  },
  {
    type: "location",
    name: "애기 동백원",
    hint: "애기 동백원",
    img: "/images/explore_camellia.jpg",
    text: "세계적으로 유명한 비글 스카우트가 하이킹에 나선다.",
    source: "- SNOOPY",
    qrCode: `${BASE_URL}sg_explore_tail_07`,
  },
];

// === [전체 4대 테마 데이터] ===
const themeData = [
  {
    id: "explore",
    title: "비글 스카우트의 위대한 탐험",
    type: "탐험형 (모험/선택)",
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
          speaker: "우드스탁",
          text: "|||| || ||| ||!",
        },
      ],
    },
    path: [
      {
        type: "location",
        name: "소설왕 스누피",
        hint: "소설왕 스누피 광장",
        img: "/images/explore_square.jpg",
        text: "'어둡고 폭풍우 치는 밤이었다...'",
        source: "- SNOOPY",
        qrCode: `${BASE_URL}sg_explore_01`,
      },
      {
        type: "location",
        name: "비글 스카우트",
        hint: "비글 스카우트 캠프",
        img: "/images/explore_camp.jpg",
        text: "세계적으로 유명한 비글 스카우트가 그의 분대를 이끌고 자연탐사를 떠난다.",
        source: "- SNOOPY",
        qrCode: `${BASE_URL}sg_explore_02`,
      },
      {
        type: "choice",
        name: "우든 어드벤처 갈림길",
        title: "하단 오브제를 하나 선택하세요!",
        options: [
          {
            label: "모닥불",
            route: [
              {
                type: "location",
                name: "비글 스카우트 텐트",
                hint: "도토리숲",
                img: "/images/explore_tent.jpg",
                text: "하이킹의 마지막 밤을 위해 좀 특별한 걸 준비했는데... 마시멜로 구워 먹기 어때?",
                source: "- SNOOPY",
                qrCode: `${BASE_URL}sg_explore_03_tent`,
              },
              ...exploreTail,
            ],
          },
          {
            label: "망원경",
            route: [
              {
                type: "location",
                name: "부엉이 스누피",
                hint: "스누피 동물원",
                img: "/images/explore_zoo.jpg",
                text: "지혜로운 늙은 부엉이가 나무 구멍으로 머리를 내밀고 있다.",
                source: "- SNOOPY",
                qrCode: `${BASE_URL}sg_explore_03_zoo`,
              },
              {
                type: "location",
                name: "블럭 전망대",
                hint: "스누피 페르소나 암석원",
                img: "/images/explore_observatory.jpg",
                text: "정찰병 노릇을 할 지원자가 하나 필요한데...",
                source: "- SNOOPY",
                qrCode: `${BASE_URL}sg_explore_04_obs`,
              },
              ...exploreTail,
            ],
          },
          {
            label: "나침반",
            route: [
              {
                type: "location",
                name: "미로",
                hint: "비자나무 숲",
                img: "/images/explore_maze.jpg",
                text: "길을 잃었을 땐 나침반을 따라가라!",
                source: "- SNOOPY",
                qrCode: `${BASE_URL}sg_explore_03_maze`,
              },
              {
                type: "choice",
                name: "미로 내 추가 선택",
                title: "나침반이 가리키는 곳은?",
                options: [
                  {
                    label: "망원경",
                    route: [
                      {
                        type: "location",
                        name: "블럭 전망대",
                        hint: "스누피 페르소나 암석원",
                        img: "/images/explore_observatory.jpg",
                        text: "정찰병 노릇을 할 지원자가 하나 필요한데...",
                        source: "- SNOOPY",
                        qrCode: `${BASE_URL}sg_explore_04_obs`,
                      },
                      ...exploreTail,
                    ],
                  },
                  {
                    label: "제주",
                    route: [
                      {
                        type: "location",
                        name: "돌하르방 스누피",
                        hint: "스누피동물원",
                        img: "/images/explore_dolhareubang.jpg",
                        text: "바위를 숭배하기로 결정한거야! 하하하하!",
                        source: "- SNOOPY",
                        qrCode: `${BASE_URL}sg_explore_04_jeju`,
                      },
                      ...exploreTail,
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "challenge",
    title: "항상 도전하는 찰리의 하루",
    type: "도전형 (공감/일상)",
    character: "- CHARIE BROWN",
    color: "orange",
    completion: {
      title: "찰리의 야구팀 신입 부원",
      dialogues: [
        {
          speaker: "찰리 브라운",
          text: "나 9회에 홈런을 쳤어, 우리팀이 이겼어! 내가 영웅이 됐다고!!",
        },
      ],
    },
    path: [
      {
        type: "location",
        name: "언덕 위 찰리 브라운",
        hint: "소설왕 스누피 광장",
        img: "/images/challenge_square.jpg",
        text: "남은 평생 여기 누워있을래.",
        source: "- CHARIE BROWN",
        qrCode: `${BASE_URL}sg_chal_01`,
      },
      {
        type: "location",
        name: "지그재그 수벽",
        hint: "소설왕 스누피광장 - 피너츠 사색 들판",
        img: "/images/challenge_zigzag.jpg",
        text: "이건 내 전용 셔츠라고!",
        source: "- CHARIE BROWN",
        qrCode: `${BASE_URL}sg_chal_02`,
      },
      {
        type: "location",
        name: "지그재그 텐트",
        hint: "도토리숲",
        img: "/images/challenge_camp.jpg",
        text: "미안해. 이 옷이 그렇게 거슬리는 줄 몰랐어.",
        source: "- CHARIE BROWN",
        qrCode: `${BASE_URL}sg_chal_03`,
      },
      {
        type: "location",
        name: "찰리 브라운의 야구장 담장",
        hint: "찰리브라운의 야구장",
        img: "/images/challenge_wall.jpg",
        text: "찰리브라운(밟지마시오)",
        source: "- CHARIE BROWN",
        qrCode: `${BASE_URL}sg_chal_04`,
      },
      {
        type: "location",
        name: "연 먹는 나무",
        hint: "찰리브라운의 야구장",
        img: "/images/challenge_baseball.jpg",
        text: "난 연먹는 나무가 정말 싫어! 순진한 어린애들의 연을 빼앗아서 나뭇가지로 붙들고 있다가 꿀꺽 삼켜버리잖아...",
        source: "- CHARIE BROWN",
        qrCode: `${BASE_URL}sg_chal_05`,
      },
      {
        type: "location",
        name: "빨간 머리 소녀",
        hint: "피너츠 컬러 가든",
        img: "/images/challenge_colorgarden.jpg",
        text: "빨간 머리 여자애한테 내 존재를 알리려면 어떻게 해야 할까...",
        source: "- CHARIE BROWN",
        qrCode: `${BASE_URL}sg_chal_06`,
      },
      {
        type: "location",
        name: "둥근 머리 정원",
        hint: "스누피 페르소나 암석원",
        img: "/images/challenge_roundhead.jpg",
        text: "그 머리통 둥근 녀석 이름이 뭐였더라...",
        source: "- CHARIE BROWN",
        qrCode: `${BASE_URL}sg_chal_07`,
      },
      {
        type: "location",
        name: "찰리브라운과 스누피의 휴식",
        hint: "하이라인 데크 아래",
        img: "/images/challenge_nest.jpg",
        text: "행복이란 내 강아지가 집으로 돌아오는 거지!",
        source: "- CHARIE BROWN",
        qrCode: `${BASE_URL}sg_chal_08`,
      },
      {
        type: "location",
        name: "썸머 캠프",
        hint: "웜 퍼피 레이크",
        img: "/images/challenge_lake.jpg",
        text: "여름 내내 아무것도 안하고 뒹굴기만 할 순 없잖아.",
        source: "- CHARIE BROWN",
        qrCode: `${BASE_URL}sg_chal_09`,
      },
      {
        type: "location",
        name: "연 먹는 나무",
        hint: "아왜니무 산책로 입구",
        img: "/images/challenge_awaetree.jpg",
        text: "이 연 먹고 싶어? 아니면 가오리연은 어때? 아니, 내가 아예 메뉴판이라도 가져다 줄까?",
        source: "- CHARIE BROWN",
        qrCode: `${BASE_URL}sg_chal_10`,
      },
      {
        type: "location",
        name: "후박나무에서 위로 받는 찰리브라운",
        hint: "유실수원 맞은편",
        img: "/images/challenge_hubaktree.jpg",
        text: "난 새로운 철학을 만들어냈어. 한번에 하루씩만 두려워하기로 말이야!",
        source: "- CHARIE BROWN",
        qrCode: `${BASE_URL}sg_chal_11`,
      },
    ],
  },
  {
    id: "relax",
    title: "나무 아래에서 즐기는 사색의 쉼",
    type: "휴식형 (페퍼민트 패티 & 마시)",
    character: "패티 & 마시",
    color: "teal",
    completion: {
      title: "자연 속 완벽 휴식",
      dialogues: [
        {
          speaker: "- PEPPERMINT PATTY",
          text: "호수, 숲, 하늘...",
        },
        {
          speaker: "- MARCIE",
          text: "맞아요... 정말 아름답네요. 선생님!",
        },
      ],
    },
    path: [
      {
        type: "location",
        name: "사색들판 패티 & 마시",
        hint: "피너츠 사색 들판",
        img: "/images/relax_field.jpg",
        text: "날씨를 욕해선 안돼요, 선생님 이것도 모두 우리가 사는 세상의 일부잖아요.",
        source: "- PEPPERMINT PATTY",
        qrCode: `${BASE_URL}sg_relax_01`,
      },
      {
        type: "location",
        name: "마시의 독서 벤치",
        hint: "팽나무 산책로",
        img: "/images/relax_paengtree.jpg",
        text: "잠언 8장의 한 구절이에요'대저 지혜는 진주보다 나으므로....",
        source: "- MARCIE",
        qrCode: `${BASE_URL}sg_relax_02`,
      },
      {
        type: "location",
        name: "패퍼민트의 그린 정원",
        hint: "피너츠 컬러 가든",
        img: "/images/relax_colorgarden.jpg",
        text: "이제 하늘은 파란색, 풀은 초록색으로 칠해야지. 노란색 꽃도 몇송이 집어놓고...",
        source: "- PEPPERMINT PATTY",
        qrCode: `${BASE_URL}sg_relax_03`,
      },
      {
        type: "location",
        name: "삼나무 숲 담요벤치",
        hint: "라이너스의 담요 숲",
        img: "/images/relax_cedar.jpg",
        text: "아뇨, 선생님... 그냥 눈 좀 감고 있었던 거예요",
        source: "- PEPPERMINT PATTY",
        qrCode: `${BASE_URL}sg_relax_04`,
      },
      {
        type: "location",
        name: "패티 & 스누피 파마머리 담장",
        hint: "야생 동백원",
        img: "/images/relax_wall.jpg",
        text: "아무래도 오늘은 제 두뇌가 휴가를 낸 것 같네요. 혹시 자동응답기에 메세지를 남기고 싶으신가요?",
        source: "- PEPPERMINT PATTY",
        qrCode: `${BASE_URL}sg_relax_05`,
      },
      {
        type: "location",
        name: "아왜나무 산책로",
        hint: "아왜나무 산책로",
        img: "/images/relax_awaetree.jpg",
        text: "가끔씩 휴식을 취하면 머리가 떨어지지 않을 거예요",
        source: "- PEPPERMINT PATTY",
        qrCode: `${BASE_URL}sg_relax_06`,
      },
      {
        type: "location",
        name: "가드닝스쿨 장미담장",
        hint: "루시의 가드닝 스쿨",
        img: "/images/relax_watermelon.jpg",
        text: "이 세상은 아름다운 꽃과 식물로 가득하지.",
        source: "- PEPPERMINT PATTY",
        qrCode: `${BASE_URL}sg_relax_watermelon`,
      },
      {
        type: "location",
        name: "나무에서 휴식을 취하는 패티",
        hint: "가든 출구",
        img: "/images/relax_exit.jpg",
        text: "인생이 이렇게 아름다울 수 있다니 미처 몰랐어!",
        source: "- PEPPERMINT PATTY",
        qrCode: `${BASE_URL}sg_relax_07`,
      },
    ],
  },
  {
    id: "sentiment",
    title: "피너츠 짝사랑 스토리",
    type: "감성형 (사랑과 기록)",
    character: "루시 & 샐리 & 라이너스",
    color: "purple",
    completion: {
      title: "우리의 감성 기록",
      dialogues: [
        {
          speaker: "- CHARIE BROWN",
          text: "으악! 짝사랑만큼 땅콩버터 맛을 떨어뜨리는 건 없어.",
        },
      ],
    },
    path: [
      {
        type: "location",
        name: "언덕 위에 세 친구",
        hint: "소설왕 스누피 광장",
        img: "/images/sentiment_square.jpg",
        text: "하루 종일 여기 그냥 누워서 구름이 떠가는 것만 봐도 되겠어...",
        source: "- LUCY",
        qrCode: `${BASE_URL}sg_senti_01`,
      },
      {
        type: "location",
        name: "사색들판 찰리 & 라이너스",
        hint: "피너츠 사색 들판",
        img: "/images/sentiment_field.jpg",
        text: "누구나 바보 같은 짓도 하고 똑똑한 짓도 하는 건가봐.",
        source: "- LINUS",
        qrCode: `${BASE_URL}sg_senti_02`,
      },
      {
        type: "location",
        name: "야구장 낙서하는 루시",
        hint: "찰리브라운의 야구장 벽면",
        img: "/images/sentiment_graffiti.jpg",
        text: "난 내방식대로 해냈어!",
        source: "- LUCY",
        qrCode: `${BASE_URL}sg_senti_graffiti`,
      },
      {
        type: "location",
        name: "샐리 & 루시의 사랑",
        hint: "피너츠 컬러 가든",
        img: "/images/sentiment_colorgarden.jpg",
        text: "사랑이란 별 이상한 짓을 다 하게 만든다니까...",
        source: "- SALLY",
        qrCode: `${BASE_URL}sg_senti_03`,
      },
      {
        type: "location",
        name: "피아노 치는 슈로더",
        hint: "슈로더의 야외무대",
        img: "/images/sentiment_stage.jpg",
        text: "어째서 넌 한번도 나를 '우리 귀염둥이'라고 불러주지 않을까?",
        source: "- LUCY",
        qrCode: `${BASE_URL}sg_senti_04`,
      },
      {
        type: "location",
        name: "루시의 고민 상담소",
        hint: "하귤밭",
        img: "/images/sentiment_cafe.jpg",
        text: "이 멍청아! 5센트나 내라고...",
        source: "- LUCY",
        qrCode: `${BASE_URL}sg_senti_05`,
      },
      {
        type: "location",
        name: "호박대왕을 기다리는 라이너스",
        hint: "펌킨 코타지",
        img: "/images/sentiment_pumpkin.jpg",
        text: "핼러윈 밤이면 호박 대왕이 호박밭에서 솟아나와 온 세상 아이들에게 장난감을 가져다주거든!",
        source: "- LINUS",
        qrCode: `${BASE_URL}sg_senti_06`,
      },
      {
        type: "location",
        name: "애착담요 라이너스",
        hint: "라이너스의 담요 숲",
        img: "/images/sentiment_blanket.jpg",
        text: "난 너의 스윗 바부가 아니야!",
        source: "- LINUS",
        qrCode: `${BASE_URL}sg_senti_07`,
      },
      {
        type: "location",
        name: "루시의 가드닝 스쿨",
        hint: "루시의 가드닝 스쿨",
        img: "/images/sentiment_gardeningschool.jpg",
        text: "슈로더, 너 내가 예쁘다고 생각하니?",
        source: "- LUCY",
        qrCode: `${BASE_URL}sg_senti_08`,
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
      return JSON.parse(saved);
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

  // 👇 설문조사 팝업창을 위한 상태값 추가
  const [showSurveyModal, setShowSurveyModal] = useState(false);

  // 스캔 실패 횟수 관리
  const [scanFailCount, setScanFailCount] = useState(0);

  const activeTheme = themeData.find((t) => t.id === activeThemeId) || null;

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
  // 🔗 [핵심 기능] URL 파라미터를 통한 외부 카메라 스캔 자동 연동 로직
  // =====================================================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrFromUrl = params.get("key"); // qr 대신 key 파라미터 확인

    if (qrFromUrl) {
      // 1. 끝없는 반복 실행을 막기 위해 파라미터를 URL에서 조용히 지웁니다.
      window.history.replaceState({}, document.title, window.location.pathname);

      const currentExpectedQR = activePath[progress]?.qrCode;

      // 2. 퀘스트를 진행 중일 때만 스캔을 허용합니다. (activePath 존재 여부)
      if (activePath.length > 0) {
        // 데이터 상 URL 뒷부분의 ID값만 추출 (?key= 기준으로 자름)
        const rawExpectedId = currentExpectedQR
          ? currentExpectedQR.split("?key=")[1]
          : null;

        if (
          rawExpectedId &&
          (qrFromUrl === rawExpectedId || qrFromUrl === "snoopy_master")
        ) {
          // 정답일 경우 자동으로 씬(Scene) 화면으로 이동
          setQrErrorMsg("");
          setScanFailCount(0);
          setStep("scene");
        } else {
          // 오답일 경우 에러 메시지와 함께 스캔 화면으로 이동
          setStep("qr");
          setQrErrorMsg(
            "앗! 현재 위치의\n정답 QR코드가 아닌 것 같아요! 🐶\n(위치를 다시 확인해주세요)"
          );
        }
      }
    }
  }, [activePath, progress]); // activePath와 progress가 로드되거나 변경될 때만 체크

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
    setScanFailCount(0); // QR 화면에 들어올 때 실패 횟수 초기화
    setStep("qr");
  };

  const handleQRSuccess = (scannedData) => {
    const currentExpectedQR = activePath[progress]?.qrCode;
    const rawExpectedId = currentExpectedQR
      ? currentExpectedQR.split("?key=")[1]
      : "";

    // [중요 로직]
    // 1) 스캔한 코드가 정답 코드일 때 (URL 전체이거나 ID만 포함되어 있을 때 모두 통과)
    // 2) 마스터 코드일 때
    // 3) 실패 횟수가 3회 이상 쌓여 '비밀리에' 프리패스가 발동될 때
    if (
      (rawExpectedId && scannedData.includes(rawExpectedId)) ||
      scannedData.includes("snoopy_master") ||
      scanFailCount >= 3
    ) {
      setQrErrorMsg("");
      setScanFailCount(0);
      setStep("scene");
    } else {
      // 오답일 경우 실패 카운트 증가시키고 일반 에러 문구 표시
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

      // 👇 코스가 완료될 때 설문조사 모달 띄우기
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
        className={`confetti ${
          colors[Math.floor(Math.random() * colors.length)]
        }`}
        style={{
          left: `${Math.random() * 100}%`,
          width: `${Math.random() * 6 + 6}px`,
          height: `${Math.random() * 12 + 6}px`,
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: `${Math.random() * 2 + 2.5}s`,
        }}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans text-stone-800 relative">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden relative flex flex-col h-[750px] max-h-[100dvh]">
        {/* 커스텀 초기화 경고 모달창 */}
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
                모든 퀘스트 진행 상황과 모은 리워드가 삭제됩니다.
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

        {/* 💡 장소 힌트 팝업 모달창 */}
        {showHintModal && (
          <div className="absolute inset-0 z-50 bg-stone-900/80 flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white rounded-3xl overflow-hidden w-full max-w-sm shadow-2xl relative flex flex-col">
              <button
                onClick={() => setShowHintModal(false)}
                className="absolute top-4 right-4 bg-stone-900/60 text-white rounded-full p-1.5 z-10 hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-full h-56 bg-stone-100 relative flex flex-col items-center justify-center">
                {activePath[progress]?.img ? (
                  <img
                    src={activePath[progress].img}
                    alt="힌트 이미지"
                    className="w-full h-full object-cover absolute inset-0 z-10"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : null}
                <div className="flex flex-col items-center justify-center text-stone-400 opacity-60 relative z-0">
                  <ImageIcon className="w-12 h-12 mb-2" />
                  <span className="text-xs">힌트 사진 준비 중</span>
                </div>
              </div>

              <div className="p-6 text-center bg-white flex-1">
                <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold mb-3">
                  <MapPin className="w-3 h-3" /> HINT
                </div>
                <p className="text-lg font-bold text-stone-800 break-keep leading-tight">
                  {activePath[progress]?.hint || "장소를 찾아주세요"}
                </p>
              </div>

              <button
                onClick={() => setShowHintModal(false)}
                className="w-full bg-stone-100 text-stone-600 font-bold py-4 hover:bg-stone-200 transition-colors border-t border-stone-200"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* 📋 코스 완료 설문조사 팝업 모달창 */}
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
                더 나은 스누피 가든 탐험을 위해
                <br />
                짧은 설문조사에 참여해 주시겠어요?
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

        {/* Header (고정) */}
        {step !== "splash" && step !== "qr" && (
          <div className="bg-stone-900 p-4 text-center text-white relative flex justify-between items-center z-10 shrink-0">
            <h1 className="text-lg font-bold tracking-tighter">
              SNOOPY GARDEN QUEST
            </h1>
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
          {/* Step 0: 스플래시 */}
          {step === "splash" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden bg-stone-900">
              <img
                src="/images/splash_bg.jpg"
                alt="스플래시 배경"
                className="absolute inset-0 w-full h-full object-cover opacity-60"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent"></div>

              <div className="z-10 flex flex-col items-center text-center px-6 w-full animate-fade-in mt-auto pb-24">
                <h1 className="text-5xl font-black tracking-tighter mb-3 text-white drop-shadow-lg">
                  SNOOPY GARDEN
                  <br />
                  QUEST
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

          {/* Step 1: 메인 화면 */}
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
                    스누피가든의 모든 미션을 완수했습니다!
                    <br />
                    배너를 터치하여 임명식을 다시 확인하세요!
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
                      - CHARIE BROWN
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
                    <Award className="w-3 h-3" /> REWARDS{" "}
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
              </div>
            </div>
          )}

          {/* Step 2: 진행 지도 */}
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
                        className={`relative flex items-start gap-4 ${
                          isFuture ? "opacity-30" : "opacity-100"
                        } transition-opacity`}
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

          {/* Step 3: 실제 카메라 QR 스캔 화면 */}
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
                  onClick={() => setShowHintModal(true)}
                  className="text-emerald-400 text-sm font-bold bg-stone-800 px-6 py-2.5 rounded-full inline-flex items-center gap-2 border border-stone-700 hover:bg-stone-700 transition-colors shadow-md"
                >
                  <MapPin className="w-4 h-4" /> 힌트 확인하기
                </button>
              </div>

              {/* 커스텀 카메라 스캐너 영역 */}
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

                {/* 스캔 가이드라인 UI (장식용) */}
                <div className="absolute inset-0 pointer-events-none border-[30px] border-stone-900/60 flex items-center justify-center z-10">
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
                  onClick={() => setStep("journey")}
                  className="w-full bg-transparent border border-stone-700 text-stone-400 font-bold py-4 rounded-2xl text-sm hover:bg-stone-800 hover:text-white transition-colors"
                >
                  지도 화면으로 돌아가기
                </button>
              </div>
            </div>
          )}

          {/* Step 4: 장면 확인 및 리워드 */}
          {step === "scene" && (
            <div className="p-6 flex-1 flex flex-col animate-fade-in h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-2">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200 mb-6">
                  <span className="font-bold text-emerald-600 text-[10px] flex items-center gap-1 mb-4 uppercase tracking-wider">
                    <MapPin className="w-3 h-3" />{" "}
                    {activePath[progress]?.name || "목적지"}
                  </span>

                  {/* 📸 이미지 렌더링 영역 */}
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
                  onClick={handleGetStamp}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-lg text-sm tracking-widest transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  GET REWARD! <Star className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5 & 6 */}
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
                      {dialogue.date && (
                        <span className="text-[10px] font-bold text-stone-400 mt-1.5 px-1">
                          {dialogue.speaker} {dialogue.date}
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
                  OFFICIAL BEAGLE SCOUT
                </span>
                <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">
                  명예 대원 임명!
                </h2>
                <p className="text-yellow-100 text-sm mb-6 font-medium break-keep px-4 opacity-90">
                  스누피가든의 모든 퀘스트를 완수한 당신을
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
                      <p className="text-sm font-bold text-yellow-50 leading-relaxed italic">
                        "살아간다는 것은 춤추는 것이고,
                        <br />
                        춤춘다는 것은 살아간다는 것이다!"
                      </p>
                      <span className="text-[10px] font-normal text-yellow-600 mt-2 block">
                        - 스누피
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
                          - 찰리 브라운
                        </span>
                      </div>
                    </div>
                    <div className="bg-stone-800 p-4 rounded-xl border border-stone-700 flex items-start gap-3 shadow-sm">
                      <Quote className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-stone-200 font-bold text-[13px] leading-relaxed break-keep">
                          "너도 가끔은 꽤 훌륭한 구석이 있구나!"
                        </p>
                        <span className="block text-[10px] font-normal text-stone-500 mt-2">
                          - 루시
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 bg-stone-900/80 p-3 rounded-lg border border-stone-700/50 flex items-start gap-2 text-left">
                    <Camera className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-stone-400 italic break-keep leading-relaxed">
                      [사진 설명: 스누피가 귀를 펄럭이며 기쁨의 '행복의 춤(Happy
                      Dance)'을 추고, 새로운 비글 스카우트 대원에게 축하의
                      박수를 보내는 장면입니다.]
                    </p>
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
