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
  X, // 팝업 닫기 아이콘 추가
} from "lucide-react";

// =====================================================================
// 🔑 [중요] 정답 QR코드 설정 (테스트용)
// =====================================================================
const VALID_QR_CODE = "snoopy_garden_quest";

// =====================================================================
// 📸 [핵심] 카메라 권한 1회 승인 및 세션 유지 매니저
// =====================================================================
let globalCameraStream = null;

const requestCameraPermissionOnce = async () => {
  if (globalCameraStream && globalCameraStream.active) return true;
  try {
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
      script.onerror = () => setCamError(true);
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
            if (now - lastScanTime > 2000) {
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
          <br />
          <br />
          <span className="text-stone-400 font-normal">
            아래 '패스하기' 버튼을
            <br />
            이용해 주세요.
          </span>
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

// === [코스 1: 탐험형 공통 후반부 합류 동선] ===
// 힌트 이미지를 별도로 두지 않고 img를 공통으로 사용합니다.
const exploreTail = [
  {
    type: "location",
    name: "스누피 파고라",
    hint: "파고라 바닥 그림자",
    img: "/images/explore_pagora.jpg",
    text: "나는 내 모습이 참 맘에 들어...",
    source: "- 스누피 (1971.01.27.)",
  },
  {
    type: "location",
    name: "정낭 조쿨",
    hint: "제주 전통 대문 앞",
    img: "/images/explore_jeongnang.jpg",
    text: "조 쿨(Joe Cool)은 그냥 서성거리며 멋있어 보일 뿐이지.",
    source: "- 조 쿨 스누피 (1971.05.27.)",
  },
  {
    type: "location",
    name: "엽란 스누피",
    hint: "엽란 식물 사이",
    img: "/images/explore_yeobran.jpg",
    text: "정글 탐험 중이다! 옆집 고양이가 나타나지 않길...",
    source: "- 비글 스카우트 대장 스누피 (1974.05.18.)",
  },
  {
    type: "location",
    name: "우드스탁 분수대",
    hint: "분수대 물줄기 앞",
    img: "/images/explore_fountain.jpg",
    text: "이건 새 목욕탕(Bird bath)이 아니라고!",
    source: "- 스누피 (1968.04.16.)",
  },
  {
    type: "location",
    name: "골퍼 스누피",
    hint: "골프채를 든 스누피 동상",
    img: "/images/explore_golfer.jpg",
    text: "골프에서 가장 중요한 건 멋진 모자를 쓰는 거지.",
    source: "- 스누피 (1988.05.06.)",
  },
  {
    type: "location",
    name: "오두막 스누피",
    hint: "작은 나무 오두막",
    img: "/images/explore_cabin.jpg",
    text: "역시 개로 사는 것의 가장 좋은 점은 마음 편히 쉴 수 있다는 거야.",
    source: "- 스누피 (1958.07.11.)",
  },
  {
    type: "location",
    name: "애기동백원",
    hint: "동백꽃 정원",
    img: "/images/explore_camellia.jpg",
    text: "위대한 비글 스카우트 대장은 숲의 모든 생물과 친구가 되지.",
    source: "- 비글 스카우트 대장 스누피 (1974.05.13.)",
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
      title: "비글 스카우트 대원 임명식",
      dialogues: [
        {
          speaker: "비글 스카우트 대장 스누피",
          text: "내가 너를 '일급 비글 스카우트 대원'으로 임명하노라!",
          date: "(1974.06.09.)",
        },
        {
          speaker: "우드스탁",
          text: "|||| || ||| ||! (짹짹! 우리 대원이 된 걸 환영해!)",
          date: "(1974.06.09.)",
        },
      ],
    },
    path: [
      {
        type: "location",
        name: "소설왕 스누피 광장",
        hint: "타자기 앞",
        img: "/images/explore_square.jpg",
        text: "'어둡고 폭풍우 치는 밤이었다...'",
        source: "- 소설가 스누피 (1965.07.12.)",
      },
      {
        type: "location",
        name: "비글 스카우트 캠프",
        hint: "폭포 앞 텐트",
        img: "/images/explore_camp.jpg",
        text: "하이킹의 가장 좋은 점은 캠프파이어와 마시멜로야!",
        source: "- 비글 스카우트 대장 스누피 (1974.06.07.)",
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
                hint: "노란 텐트 앞",
                img: "/images/explore_tent.jpg",
                text: "텐트 생활은 훌륭해! 내 개집 지붕 위 다음으로 말이야.",
                source: "- 비글 스카우트 대장 스누피 (1974.05.14.)",
              },
              ...exploreTail,
            ],
          },
          {
            label: "망원경",
            route: [
              {
                type: "location",
                name: "스누피 동물원",
                hint: "기린 흉내 스누피",
                img: "/images/explore_zoo.jpg",
                text: "크앙! 나는 세계적으로 유명한 호랑이다!",
                source: "- 세계적으로 유명한 동물 스누피 (1969.04.14.)",
              },
              {
                type: "location",
                name: "전망대",
                hint: "높은 전망대 꼭대기",
                img: "/images/explore_observatory.jpg",
                text: "비글 스카우트는 가장 높은 곳을 정복한다!",
                source: "- 비글 스카우트 대장 스누피 (1974.05.21.)",
              },
              ...exploreTail,
            ],
          },
          {
            label: "나침반",
            route: [
              {
                type: "location",
                name: "비자나무숲 미로",
                hint: "미로 입구",
                img: "/images/explore_maze.jpg",
                text: "비글 스카우트는 절대 길을 잃지 않는다! 단지 약간 헤맬 뿐...",
                source: "- 비글 스카우트 대장 스누피 (1974.05.15.)",
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
                        name: "전망대",
                        hint: "전망대 꼭대기",
                        img: "/images/explore_observatory.jpg",
                        text: "세상을 내려다보는 건 정말 멋진 일이야.",
                        source: "- 비글 스카우트 대장 스누피 (1974.05.15.)",
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
                        hint: "돌하르방 동상 앞",
                        img: "/images/explore_dolhareubang.jpg",
                        text: "나는 세계적으로 유명한 조각상이다!",
                        source:
                          "- 세계적으로 유명한 조각상 스누피 (1968.08.09.)",
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
    character: "찰리 브라운",
    color: "orange",
    completion: {
      title: "찰리의 야구팀 신입 부원",
      dialogues: [
        {
          speaker: "찰리 브라운",
          text: "내 팀에서 뛰게 된 건 정말 큰 영광일 거야...",
          date: "(1959.03.22.)",
        },
        { speaker: "루시", text: "우린 망했어.", date: "(1959.03.22.)" },
      ],
    },
    path: [
      {
        type: "location",
        name: "소설왕 스누피 광장",
        hint: "언덕 위 잔디밭",
        img: "/images/challenge_square.jpg",
        text: "어떤 날은 누워서 하늘을 바라보는 게 네가 할 수 있는 최고의 일이야.",
        source: "- 찰리 브라운 (1961.08.05.)",
      },
      {
        type: "location",
        name: "지그재그 수벽",
        hint: "지그재그 무늬 나무 벽",
        img: "/images/challenge_zigzag.jpg",
        text: "내 인생은 왜 항상 이렇게 꼬이는 걸까?",
        source: "- 찰리 브라운 (1959.01.21.)",
      },
      {
        type: "location",
        name: "비글 스카우트 캠프",
        hint: "지그재그 텐트 앞",
        img: "/images/challenge_camp.jpg",
        text: "가끔 난 우리 개가 평범했으면 좋겠어... 어떻게 텐트까지 내 셔츠 무늬로 칠할 생각을 했지?",
        source: "- 찰리 브라운 (1973.08.19.)",
      },
      {
        type: "location",
        name: "찰리 브라운의 야구장 담장",
        hint: "빈티지 낙서 벽",
        img: "/images/challenge_wall.jpg",
        text: "가끔은 모든 게 훨씬 단순했던 옛날이 그리워.",
        source: "- 찰리 브라운 (1965.11.11.)",
      },
      {
        type: "location",
        name: "찰리 브라운의 야구장",
        hint: "연 먹는 나무 근처",
        img: "/images/challenge_baseball.jpg",
        text: "야구를 하러 왔는데, 저 연 먹는 나무가 내 야구공까지 노리고 있는 것 같아.",
        source: "- 찰리 브라운 (1965.04.11.)",
      },
      {
        type: "location",
        name: "피너츠 컬러가든",
        hint: "빨간 꽃밭",
        img: "/images/challenge_colorgarden.jpg",
        text: "빨간 머리 소녀가 내게 미소 지었어!",
        source: "- 찰리 브라운 (1961.11.19.)",
      },
      {
        type: "location",
        name: "둥근 머리 정원",
        hint: "동그란 나무",
        img: "/images/challenge_roundhead.jpg",
        text: "나는 왜 이렇게 둥근 머리를 가졌을까?",
        source: "- 찰리 브라운 (1953.08.15.)",
      },
      {
        type: "location",
        name: "낮잠 둥지",
        hint: "둥지 속 쉼터",
        img: "/images/challenge_nest.jpg",
        text: "아무것도 안 하고 가만히 있는 건 내가 제일 잘하는 일 중 하나야.",
        source: "- 찰리 브라운 (1962.06.28.)",
      },
      {
        type: "location",
        name: "웜 퍼피 레이크",
        hint: "호숫가 나루터",
        img: "/images/challenge_lake.jpg",
        text: "여름 캠프에 가려고 짐을 싸는 중인데, 난 벌써 향수병에 걸렸어!",
        source: "- 찰리 브라운 (1965.07.21.)",
      },
      {
        type: "location",
        name: "아왜나무 산책로 입구",
        hint: "또 다른 연 먹는 나무",
        img: "/images/challenge_awaetree.jpg",
        text: "이건 그 멍청한 연 먹는 나무야!",
        source: "- 찰리 브라운 (1965.04.11.)",
      },
      {
        type: "location",
        name: "후박나무 (종료)",
        hint: "머리를 박고 있는 동상",
        img: "/images/challenge_hubaktree.jpg",
        text: "가끔 좌절해서 나무에 머리를 박더라도 괜찮아. 내일은 항상 새로운 하루가 시작되니까!",
        source: "- 찰리 브라운 (1968.07.16.)",
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
          speaker: "페퍼민트 패티",
          text: "저 아름다운 하늘 좀 봐, 마시...",
          date: "(1989.08.12.)",
        },
        {
          speaker: "마시",
          text: "정말 아름다워요, 선생님.",
          date: "(1989.08.12.)",
        },
        {
          speaker: "페퍼민트 패티",
          text: "선생님이라고 부르지 말라니까!!",
          date: "(1989.08.12.)",
        },
      ],
    },
    path: [
      {
        type: "location",
        name: "피너츠 사색 들판",
        hint: "돌담 앞",
        img: "/images/relax_field.jpg",
        text: "이렇게 턱을 괴고 조용히 바람을 느끼는 것만으로도, 복잡한 걱정은 다 사라지는 기분이야.",
        source: "- 페퍼민트 패티 (1981.07.02.)",
      },
      {
        type: "location",
        name: "팽나무 길",
        hint: "마시 동상 벤치",
        img: "/images/relax_paengtree.jpg",
        text: "선생님, 숲속에서 역사책을 읽으니 꽤 괜찮네요.",
        source: "- 마시 (1985.06.14.)",
      },
      {
        type: "location",
        name: "피너츠 컬러가든",
        hint: "초록색 정원",
        img: "/images/relax_colorgarden.jpg",
        text: "가끔은 야구 방망이를 내려놓고, 이 예쁜 꽃들의 향기를 맡는 것도 꽤 괜찮은걸, 마시.",
        source: "- 페퍼민트 패티 (1978.05.22.)",
      },
      {
        type: "location",
        name: "삼나무 숲",
        hint: "숲길",
        img: "/images/relax_cedar.jpg",
        text: "학교 교실보다 숲속에 있는 게 훨씬 나아!",
        source: "- 페퍼민트 패티 (1980.07.15.)",
      },
      {
        type: "location",
        name: "캐릭터 담장",
        hint: "머리모양 담장",
        img: "/images/relax_wall.jpg",
        text: "이봐, 코 큰 꼬마! 내 머리카락이 아무리 수세미 같아도 네 펄럭이는 귀보다는 나을걸!",
        source: "- 페퍼민트 패티 (1974.08.15.)",
      },
      {
        type: "location",
        name: "아왜나무 산책로",
        hint: "명상의 길",
        img: "/images/relax_awaetree.jpg",
        text: "찰스가 내 생각을 하고 있을까?",
        source: "- 페퍼민트 패티 (1982.08.05.)",
      },
      {
        type: "location",
        name: "가든 출구 (종료)",
        hint: "기대어 쉬는 나무",
        img: "/images/relax_exit.jpg",
        text: "인생의 가장 큰 비밀은, 그냥 푹 자는 거야. Zzz...",
        source: "- 페퍼민트 패티 (1984.05.20.)",
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
          speaker: "찰리 브라운",
          text: "짝사랑만큼 땅콩버터 맛을 떨어뜨리는 건 없어.",
          date: "(1979.08.09.)",
        },
        {
          speaker: "루시",
          text: "내가 진짜 필요한 건 사랑이야. 하지만 가끔 먹는 초콜릿도 나쁘지 않지!",
          date: "(1989.08.27.)",
        },
        {
          speaker: "샐리",
          text: "나의 스윗 바부가 나를 쳐다봤어! 이 완벽한 순간을 기억할 거야!",
          date: "(1977.08.22.)",
        },
      ],
    },
    path: [
      {
        type: "location",
        name: "소설왕 스누피 광장",
        hint: "언덕 위 세 친구",
        img: "/images/sentiment_square.jpg",
        text: "난 저 구름을 보며 키 크고 잘생긴 남자를 상상할래!",
        source: "- 루시 (1960.08.14.)",
      },
      {
        type: "location",
        name: "사색 들판 (조형물)",
        hint: "담장에 기댄 라이너스",
        img: "/images/sentiment_field.jpg",
        text: "누군가 나를 좋아해 준다면, 내 인생은 완전히 달라질 텐데...",
        source: "- 찰리 브라운 (1960.05.03.)",
      },
      {
        type: "location",
        name: "피너츠 컬러가든 (하트)",
        hint: "하트 조형물 앞",
        img: "/images/sentiment_colorgarden.jpg",
        text: "사랑은 사람을 맹목적으로 만들어!",
        source: "- 샐리 (1981.05.15.)",
      },
      {
        type: "location",
        name: "슈로더의 야외무대",
        hint: "피아노 앞",
        img: "/images/sentiment_stage.jpg",
        text: "베토벤이 뭐가 그렇게 중요해? 지금 네 앞에 이렇게 예쁜 내가 있는데!",
        source: "- 루시 (1956.01.24.)",
      },
      {
        type: "location",
        name: "루시의 레몬에이드 카페",
        hint: "5센트 상담 부스",
        img: "/images/sentiment_cafe.jpg",
        text: "심리 상담은 5센트야! 짝사랑의 고통? 선불로 내면 다 들어주지.",
        source: "- 정신과 의사 루시 (1959.03.27.)",
      },
      {
        type: "location",
        name: "호박 대왕의 호박밭",
        hint: "거대한 호박 모형",
        img: "/images/sentiment_pumpkin.jpg",
        text: "조금만 더 기다려봐, 샐리! 위대한 호박 대왕은 의심하지 않고 믿는 사람에게만 나타난다고!",
        source: "- 라이너스 (1968.10.31.)",
      },
      {
        type: "location",
        name: "라이너스의 담요 숲",
        hint: "담요가 걸린 숲길",
        img: "/images/sentiment_blanket.jpg",
        text: "담요 없이 어떻게 살아갈 수 있겠어?",
        source: "- 라이너스 (1954.06.01.)",
      },
      {
        type: "location",
        name: "루시의 가드닝 스쿨 (종료)",
        hint: "온실 스쿨 입구",
        img: "/images/sentiment_gardeningschool.jpg",
        text: "내가 이렇게 예쁜데 슈로더는 왜 피아노만 치는 거야?",
        source: "- 루시 (1956.01.24.)",
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
    setStep("qr");
  };

  const handleQRSuccess = (scannedData) => {
    if (scannedData === VALID_QR_CODE) {
      setQrErrorMsg("");
      setStep("scene");
    } else {
      setQrErrorMsg("앗! 스누피가든 퀘스트 전용\nQR코드가 아닌 것 같아요! 🐶");
      setTimeout(() => {
        setQrErrorMsg("");
      }, 3000);
    }
  };

  const handleQRSkip = (e) => {
    if (e) e.preventDefault();
    try {
      setQrErrorMsg("");
      setStep("scene");
    } catch (err) {
      console.error("QR Skip 방어막 에러:", err);
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

        {/* 💡 장소 힌트 팝업 모달창 (다음 화면 이미지 연동 완료) */}
        {showHintModal && (
          <div className="absolute inset-0 z-50 bg-stone-900/80 flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white rounded-3xl overflow-hidden w-full max-w-sm shadow-2xl relative flex flex-col">
              {/* 닫기 버튼 */}
              <button
                onClick={() => setShowHintModal(false)}
                className="absolute top-4 right-4 bg-stone-900/60 text-white rounded-full p-1.5 z-10 hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* 힌트 이미지 영역 (다음 씬의 이미지(img)와 100% 동일한 경로를 사용) */}
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

              {/* 힌트 텍스트 영역 */}
              <div className="p-6 text-center bg-white flex-1">
                <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold mb-3">
                  <MapPin className="w-3 h-3" /> HINT
                </div>
                <p className="text-lg font-bold text-stone-800 break-keep leading-tight">
                  {activePath[progress]?.hint || "장소를 찾아주세요"}
                </p>
              </div>

              {/* 팝업 하단 확인 버튼 */}
              <button
                onClick={() => setShowHintModal(false)}
                className="w-full bg-stone-100 text-stone-600 font-bold py-4 hover:bg-stone-200 transition-colors border-t border-stone-200"
              >
                확인
              </button>
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
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stone-900 text-white overflow-hidden">
              <div className="z-10 flex flex-col items-center text-center px-6 w-full animate-fade-in">
                <div className="w-20 h-20 bg-emerald-500 rounded-3xl rotate-12 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                  <Map className="w-10 h-10 text-white -rotate-12" />
                </div>

                <h1 className="text-4xl font-black tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-400">
                  SNOOPY GARDEN
                  <br />
                  QUEST
                </h1>
                <p className="text-emerald-400 text-[10px] tracking-[0.3em] mb-16 uppercase font-bold">
                  위대한 모험의 시작
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    await requestCameraPermissionOnce();
                    setStep("intro");
                  }}
                  className="group relative w-full max-w-[240px] bg-white text-stone-900 font-black py-4 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:bg-emerald-50 hover:text-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 overflow-hidden"
                >
                  <span className="relative z-10 tracking-widest text-sm">
                    PRESS TO START
                  </span>
                  <ChevronRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-emerald-100 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                </button>
              </div>
              <div className="absolute bottom-8 text-[9px] text-stone-500 tracking-widest font-bold">
                TAP TO BEGIN YOUR ADVENTURE
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
                      "아, 위대한 대자연이여!
                      <br />
                      자, 새로운 모험을 향해 전진!"
                    </p>
                    <span className="text-[10px] font-normal text-emerald-600 mt-2 block">
                      - 비글 스카우트 대장 스누피 (1974.05.13.)
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
                      {activePath[progress]?.options?.map((opt, i) => (
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

                {/* 힌트 내용을 직접 텍스트로 보여주지 않고 '힌트 버튼'으로 대체 */}
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

              {/* 하단 패스 및 돌아가기 버튼 */}
              <div className="flex flex-col gap-3 w-full z-10 shrink-0">
                <button
                  type="button"
                  onClick={handleQRSkip}
                  className="w-full bg-stone-800 hover:bg-stone-700 text-emerald-400 font-bold py-4 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 border border-stone-700 shadow-md"
                >
                  <CheckCircle className="w-4 h-4" /> QR코드 패스하기 (테스트용)
                </button>
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

          {/* Step 5 & 6 (기존과 동일) */}
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
                        - 스누피 (1984.02.24.)
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
                          - 찰리 브라운 (1959.10.15.)
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
                          - 루시 (1955.03.22.)
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
