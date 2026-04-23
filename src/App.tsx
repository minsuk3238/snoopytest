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
  Trophy,
  Sparkles,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

// =====================================================================
// 🔑 [중요] 정답 QR코드 설정
// =====================================================================
const VALID_QR_CODE = "snoopy_garden_quest";

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

  // jsQR 라이브러리 로드
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

  // 카메라 권한 요청 및 스트리밍 시작
  useEffect(() => {
    if (!isJsQRLoaded) return;
    let stream = null;
    let animationFrameId;
    let lastScanTime = 0; // 중복 스캔 방지 타이머

    const startCamera = async () => {
      try {
        // 스마트폰 후면 카메라 우선 요청
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch (err) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (fallbackErr) {
          console.error("카메라 권한 거부", fallbackErr);
          setCamError(true);
          if (onErrorRef.current) onErrorRef.current(fallbackErr);
          return;
        }
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
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
            {
              inversionAttempts: "dontInvert",
            }
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
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
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
const exploreTail = [
  {
    type: "location",
    name: "스누피 파고라",
    hint: "파고라 바닥 그림자",
    img: "",
    sceneDesc:
      "[사진 설명: 오후 햇빛을 받아 바닥에 스누피 모양 그림자가 예쁘게 드리워진 파고라 구조물입니다.]",
    text: "그림자가 나보다 더 멋져 보이는 건 기분 탓일까? (1970년대 조 쿨 시리즈 설정)",
  },
  {
    type: "location",
    name: "정낭 조쿨",
    hint: "제주 전통 대문 앞",
    img: "",
    sceneDesc:
      "[사진 설명: 제주의 전통 대문인 정낭에 기대어 선글라스를 끼고 멋지게 포즈를 취한 스누피입니다.]",
    text: "조 쿨(Joe Cool)은 문 따위 신경 쓰지 않지. 그냥 멋지게 기대어 있을 뿐. (1971.05.27)",
  },
  {
    type: "location",
    name: "엽란 스누피 ➔ 우드스탁 분수대 ➔ 골퍼 스누피 ➔ 오두막 스누피",
    hint: "연속된 조형물 구간",
    img: "",
    sceneDesc:
      "[사진 설명: 엽란 사이의 스누피, 시원한 분수대, 골프 치는 모습, 그리고 나무 오두막 위의 스누피가 차례로 이어집니다.]",
    text: "정글을 지나 분수대에서 씻고, 골프 한 판 친 다음 오두막에서 쉬는 게 진정한 탐험이지!",
  },
  {
    type: "location",
    name: "애기동백원",
    hint: "동백꽃 정원",
    img: "",
    sceneDesc:
      "[사진 설명: 붉은 애기동백꽃이 만발한 정원에서 나비와 함께 평화롭게 놀고 있는 스누피입니다.]",
    text: "나비가 코에 앉았네. 탐험의 완벽한 마무리야!",
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
          speaker: "스누피 대장",
          text: "내가 너를 '일급 비글 스카우트 대원'으로 임명하노라! (I hereby promote you to the rank of First Class Beagle Scout!) - 1974.06.09",
        },
        {
          speaker: "우드스탁",
          text: "|||| || ||| ||! (짹짹! 우리 대원이 된 걸 환영해!)",
        },
      ],
    },
    path: [
      {
        type: "location",
        name: "소설왕 스누피 광장",
        hint: "타자기 앞",
        img: "",
        sceneDesc:
          "[사진 설명: 타자기 앞에 앉아 탐험 일지를 시작하는 스누피의 모습입니다.]",
        text: "'어둡고 폭풍우 치는 밤이었다...' (It was a dark and stormy night...) 탐험 일지는 이렇게 시작해야지! (1965.07.12)",
      },
      {
        type: "location",
        name: "비글 스카우트 캠프",
        hint: "폭포 앞 텐트",
        img: "",
        sceneDesc:
          "[사진 설명: 폭포 앞에서 대원들과 조우하며 탐험의 영감을 받는 스카우트 대원들입니다.]",
        text: "캠프파이어 앞에서는 누구나 평등하다. 특히 마시멜로를 구울 때는 더더욱!",
      },
      {
        type: "choice",
        name: "우든 어드벤처 갈림길",
        title: "어떤 오브제를 선택할까요?",
        options: [
          {
            label: "모닥불",
            desc: "따스한 온기가 있는 텐트로",
            route: [
              {
                type: "location",
                name: "비글 스카우트 텐트",
                hint: "노란 텐트 앞",
                img: "",
                sceneDesc: "[사진 설명: 아늑한 노란 텐트 풍경입니다.]",
                text: "텐트 생활은 훌륭해! 내 개집 지붕 위 다음으로 말이야. (1970년대 야영 밈)",
              },
              ...exploreTail,
            ],
          },
          {
            label: "망원경",
            desc: "동물원 ➔ 전망대로",
            route: [
              {
                type: "location",
                name: "스누피 동물원",
                hint: "기린 흉내 스누피",
                img: "",
                sceneDesc:
                  "[사진 설명: 기린, 부엉이를 흉내 내는 스누피 길입니다.]",
                text: "크앙! 나는 무서운 뱀파이어 배트다! 아니면 기린인가? (1960년대 동물 흉내 밈)",
              },
              {
                type: "location",
                name: "전망대",
                hint: "높은 전망대 꼭대기",
                img: "",
                sceneDesc:
                  "[사진 설명: 전망대 위에서 망원경으로 가든을 내려다보는 모습입니다.]",
                text: "저기 프렌치 프라이산(Mount French Fry)이 보이는군! 전진! (1970년대 산악 밈)",
              },
              ...exploreTail,
            ],
          },
          {
            label: "나침반",
            desc: "미로 구역 탐험",
            route: [
              {
                type: "location",
                name: "비자나무숲 미로",
                hint: "미로 입구",
                img: "",
                sceneDesc:
                  "[사진 설명: 복잡한 미로 속에서 나침반을 든 스누피입니다.]",
                text: "비글 스카우트는 절대 길을 잃지 않는다! 단지 약간 헤맬 뿐... (1974.05.15)",
              },
              {
                type: "choice",
                name: "미로 내 추가 선택",
                title: "나침반이 가리키는 곳은?",
                options: [
                  {
                    label: "망원경",
                    desc: "전망대로 합류",
                    route: [
                      {
                        type: "location",
                        name: "전망대",
                        hint: "전망대 꼭대기",
                        img: "",
                        sceneDesc:
                          "[사진 설명: 전망대에서 망원경을 보는 모습입니다.]",
                        text: "드디어 전망대다! 높은 곳은 언제나 옳지.",
                      },
                      ...exploreTail,
                    ],
                  },
                  {
                    label: "제주",
                    desc: "돌하르방 스누피로",
                    route: [
                      {
                        type: "location",
                        name: "돌하르방 스누피",
                        hint: "돌하르방 동상 앞",
                        img: "",
                        sceneDesc:
                          "[사진 설명: 돌하르방 모습으로 변신한 듬직한 스누피입니다.]",
                        text: "가끔은 낯선 곳의 조각상이 되어 철학적인 생각을 해보는 것도 좋아.",
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
          text: "내 팀에서 뛰게 된 건 정말 큰 영광일 거야... 넌 이제부터 우리의 야구부원이야! 환영해. (1959. 야구팀 결성 에피소드)",
        },
        { speaker: "루시", text: "우린 망했어. (We're doomed.)" },
      ],
    },
    path: [
      {
        type: "location",
        name: "소설왕 스누피 광장",
        hint: "언덕 위 잔디밭",
        img: "",
        sceneDesc:
          "[사진 설명: 언덕에 루시, 라이너스와 함께 누워있는 찰리 브라운입니다.]",
        text: "가끔은 이렇게 누워 있으면, 내 걱정들이 저 구름처럼 날아가 버릴 것 같아.",
      },
      {
        type: "location",
        name: "지그재그 수벽",
        hint: "지그재그 무늬 나무 벽",
        img: "",
        sceneDesc:
          "[사진 설명: 찰리의 상징인 지그재그 문양이 새겨진 나무 벽입니다.]",
        text: "내 셔츠 무늬잖아. 이 패턴을 보면 왠지 야구에서 또 질 것 같은 기분이 들어.",
      },
      {
        type: "location",
        name: "비글 스카우트 캠프 (텐트 확인)",
        hint: "지그재그 텐트 앞",
        img: "",
        sceneDesc:
          "[사진 설명: 찰리의 옷 무늬가 새겨진 텐트를 확인하는 장면입니다.]",
        text: "내 개는 평범한 개가 아니야. 자기 텐트 디자인까지 직접 한다고.",
      },
      {
        type: "location",
        name: "찰리 브라운의 야구장 담장",
        hint: "빈티지 낙서 벽",
        img: "",
        sceneDesc:
          "[사진 설명: 1950년대 초기 찰리의 낙서가 그려진 담장입니다.]",
        text: "옛날 친구들과 야구하던 생각이 나네. (1950년대 초기 설정)",
      },
      {
        type: "location",
        name: "찰리 브라운의 야구장",
        hint: "연 먹는 나무 근처",
        img: "",
        sceneDesc:
          "[사진 설명: 야구장에서 '연 먹는 나무'를 쳐다보는 찰리입니다.]",
        text: "투수 마운드에 서면 세상에서 혼자가 된 기분이야. (1956.04.12 연 먹는 나무 최초 등장)",
      },
      {
        type: "location",
        name: "피너츠 컬러가든 (찰리 테마)",
        hint: "빨간 꽃밭",
        img: "",
        sceneDesc:
          "[사진 설명: 짝사랑하는 빨간 머리 소녀를 생각하며 수줍어하는 찰리입니다.]",
        text: "빨간 머리 소녀가 이 꽃을 보면 나를 떠올려 줄까? (짝사랑 테마)",
      },
      {
        type: "location",
        name: "둥근 머리 정원 ➔ 낮잠 둥지",
        hint: "동그란 나무와 둥지",
        img: "",
        sceneDesc:
          "[사진 설명: 찰리의 머리를 닮은 나무와 따스한 햇빛 아래 쉬는 찰리 & 스누피입니다.]",
        text: "다들 날 '둥근 머리 꼬마'라고 놀리지만, 누워있는 건 내가 제일 잘하는 일이야.",
      },
      {
        type: "location",
        name: "웜 퍼피 레이크",
        hint: "호숫가 나루터",
        img: "",
        sceneDesc: "[사진 설명: 썸머 캠프를 준비하는 찰리와 스누피입니다.]",
        text: "여름 캠프에 가면 완전히 새로운 나를 보여줄 거야! ...아마 첫날부터 향수병에 걸리겠지만.",
      },
      {
        type: "location",
        name: "아왜나무 산책로 입구",
        hint: "또 다른 연 먹는 나무",
        img: "",
        sceneDesc:
          "[사진 설명: 길목에서 또 마주친 연 먹는 나무를 경계하는 찰리입니다.]",
        text: "저건 틀림없이 내 연을 먹어 치우는 '연 먹는 나무'야. 이번엔 안 속아!",
      },
      {
        type: "location",
        name: "후박나무 (종료)",
        hint: "머리를 박고 있는 동상",
        img: "",
        sceneDesc:
          "[사진 설명: 나무에 머리를 박고 고개를 숙이고 있는 안쓰러운 찰리 브라운입니다.]",
        text: "가끔은 '우웩(AUGH)!!' 하고 소리치고 싶을 때가 있어. 인생이란...",
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
      title: "자연 속 완벽한 휴식",
      dialogues: [
        {
          speaker: "페퍼민트 패티",
          text: "잔잔한 호수, 푸른 나무들, 그리고 맑은 하늘... 정말 끝내주지 않아, 마시? (1989.08)",
        },
        {
          speaker: "마시",
          text: "정말 아름다워요, 선생님. (They're beautiful, sir.)",
        },
        { speaker: "페퍼민트 패티", text: "선생님이라고 부르지 말라니까!!" },
      ],
    },
    path: [
      {
        type: "location",
        name: "피너츠 사색 들판",
        hint: "돌담 근처",
        img: "",
        sceneDesc:
          "[사진 설명: 제주의 돌담에 기대어 사색에 잠긴 패티와 마시입니다.]",
        text: "Z-마이너스 성적표 따위는 잊어버려, 마시. 오늘 같은 날은 멍때리는 게 최고야. (1970년대 성적표 밈)",
      },
      {
        type: "location",
        name: "팽나무 길",
        hint: "마시 동상 벤치",
        img: "",
        sceneDesc: "[사진 설명: 벤치에 앉아 책을 읽고 있는 마시 조형물입니다.]",
        text: "선생님, 숲속에서 역사책을 읽으니 자연과 하나 되는 기분이네요. (독서 밈)",
      },
      {
        type: "location",
        name: "피너츠 컬러가든 (패티 테마)",
        hint: "초록색 정원",
        img: "",
        sceneDesc: "[사진 설명: 패티를 상징하는 초록색 테마 정원입니다.]",
        text: "이 초록색 정원을 보니 야구장에 온 것 같아! 당장이라도 홈런을 칠 수 있겠어!",
      },
      {
        type: "location",
        name: "삼나무 숲 ➔ 캐릭터 담장",
        hint: "숲길과 머리모양 담장",
        img: "",
        sceneDesc:
          "[사진 설명: 빽빽한 삼나무 길과 패티 & 스누피 실루엣 담장입니다.]",
        text: "학교 교실의 분필 가루 냄새보다 숲의 나무 냄새가 백 배는 낫다고!",
      },
      {
        type: "location",
        name: "아왜나무 산책로",
        hint: "고요한 흙길",
        img: "",
        sceneDesc:
          "[사진 설명: 자연 속 고요한 걷기 명상을 즐기는 산책 코스입니다.]",
        text: "찰스(Chuck)도 우리랑 같이 걸었으면 좋았을 텐데. 안 그래, 마시?",
      },
      {
        type: "location",
        name: "가든 출구 (종료)",
        hint: "기대어 쉬는 나무",
        img: "",
        sceneDesc:
          "[사진 설명: 나무에 기대어 세상 편안하게 쉬고 있는 페퍼민트 패티입니다.]",
        text: "가끔 인생의 정답은 나무 아래서 푹 자고 일어나는 거야. Zzz...",
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
          text: "짝사랑만큼 땅콩버터 맛을 떨어뜨리는 건 없어. (Nothing takes the taste out of peanut butter quite like unrequited love.) - 1979.08.09",
        },
        {
          speaker: "루시",
          text: "내가 진짜 필요한 건 사랑이야. 하지만 가끔 먹는 초콜릿도 나쁘지 않지! (1989.08.27)",
        },
        {
          speaker: "샐리",
          text: "나의 '스윗 바부'를 본 이 완벽한 순간을 기억해야 해!",
        },
      ],
    },
    path: [
      {
        type: "location",
        name: "소설왕 스누피 광장",
        hint: "언덕 위 세 친구",
        img: "",
        sceneDesc:
          "[사진 설명: 광장 언덕에 누워있는 루시, 찰리, 라이너스입니다.]",
        text: "구름을 보며 상상하는 건 멋져. 난 저 구름이 꼭 베토벤의 옆모습 같아!",
      },
      {
        type: "location",
        name: "사색 들판 (조형물)",
        hint: "담장에 기댄 라이너스",
        img: "",
        sceneDesc:
          "[사진 설명: 담장에 기대어 있는 라이너스와 찰리 브라운 조형물입니다.]",
        text: "제일 큰 비극은 내가 예쁘게 입고 나왔는데 찰스(Chuck)가 못 볼 때지.",
      },
      {
        type: "location",
        name: "피너츠 컬러가든 (하트)",
        hint: "하트 조형물 앞",
        img: "",
        sceneDesc:
          "[사진 설명: 포맥스 하트 조형물과 라이너스 & 샐리 정원입니다.]",
        text: "사랑은 사람을 바보로 만든대. 그래도 누군가를 좋아하는 마음은 소중해!",
      },
      {
        type: "location",
        name: "슈로더의 야외무대",
        hint: "피아노 앞",
        img: "",
        sceneDesc:
          "[사진 설명: 피아노에 열중하는 슈로더와 그를 보는 루시입니다.]",
        text: "베토벤이 뭐가 그렇게 중요해? 지금 네 앞에 이렇게 예쁜 내가 있는데! (짝사랑 밈)",
      },
      {
        type: "location",
        name: "루시의 레몬에이드 카페 (하귤밭)",
        hint: "5센트 상담 부스",
        img: "",
        sceneDesc: "[사진 설명: 루시의 5센트 심리 상담소 풍경입니다.]",
        text: "심리 상담은 5센트야! 짝사랑의 고통? 선불로 내면 다 들어주지. (1959.03.27)",
      },
      {
        type: "location",
        name: "호박 대왕의 호박밭",
        hint: "거대한 호박 모형",
        img: "",
        sceneDesc:
          "[사진 설명: 함께 호박 대왕을 기다리는 라이너스와 샐리입니다.]",
        text: "위대한 호박 대왕은 꼭 올 거야! 네가 날 '스윗 바부'라고 부르지만 않는다면 말이지.",
      },
      {
        type: "location",
        name: "라이너스의 담요 숲",
        hint: "담요가 걸린 나무",
        img: "",
        sceneDesc: "[사진 설명: 짝사랑의 포근함이 느껴지는 숲길 산책로입니다.]",
        text: "안심 담요처럼, 누군가를 좋아하는 마음도 우리를 따뜻하게 감싸주나 봐. (1954.06.01 안심담요 등장)",
      },
      {
        type: "location",
        name: "루시의 가드닝 스쿨 (종료)",
        hint: "온실 스쿨 입구",
        img: "",
        sceneDesc:
          "[사진 설명: 짝사랑의 감정을 갈무리하며 정원을 가꾸는 루시입니다.]",
        text: "내 사랑도 이 식물들처럼 무럭무럭 자랄 거야! 슈로더가 피아노만 그만 친다면 말이야.",
      },
    ],
  },
];

const STORAGE_KEY = "snoopy_quest_state_final";

const getInitialState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
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
  const [isQrAuthenticated, setIsQrAuthenticated] = useState(
    initialState?.isQrAuthenticated || false
  );

  const activeTheme = themeData.find((t) => t.id === activeThemeId) || null;

  useEffect(() => {
    const stateToSave = {
      step,
      activeThemeId,
      activePath,
      progress,
      completedThemes,
      themeStates,
      isQrAuthenticated,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [
    step,
    activeThemeId,
    activePath,
    progress,
    completedThemes,
    themeStates,
    isQrAuthenticated,
  ]);

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
      setIsQrAuthenticated(true);
      setStep("scene");
    } else {
      setQrErrorMsg("앗! 스누피가든 퀘스트 전용\nQR코드가 아닌 것 같아요! 🐶");
      setTimeout(() => {
        setQrErrorMsg("");
      }, 3000);
    }
  };

  const handleQRSkip = () => {
    setQrErrorMsg("");
    setIsQrAuthenticated(true);
    setStep("scene");
  };

  const handleGetStamp = () => {
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

  const handleResetAll = () => {
    if (
      window.confirm("모든 퀘스트 진행 상황과 리워드를 초기화하시겠습니까?")
    ) {
      localStorage.removeItem(STORAGE_KEY);
      setActiveThemeId(null);
      setActivePath([]);
      setProgress(0);
      setCompletedThemes([]);
      setThemeStates({});
      setIsQrAuthenticated(false);
      setStep("splash");
    }
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
        {/* Header */}
        {step !== "splash" && step !== "qr" && (
          <div className="bg-stone-900 p-4 text-center text-white relative flex justify-between items-center z-10 shrink-0">
            <h1 className="text-lg font-bold tracking-tighter">
              SNOOPY GARDEN QUEST
            </h1>
            {activeTheme && step !== "intro" && step !== "grandClear" && (
              <button
                onClick={resetQuest}
                className="text-[10px] text-stone-400 border border-stone-700 px-2 py-1 rounded hover:bg-stone-800 transition"
              >
                EXIT
              </button>
            )}
            {!activeTheme && step === "intro" && (
              <button
                onClick={handleResetAll}
                className="text-[10px] text-stone-400 border border-stone-700 px-2 py-1 rounded hover:bg-stone-800 transition"
              >
                초기화
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-stone-50 flex flex-col relative">
          {/* Step 0: 스플래시 */}
          {step === "splash" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stone-900 text-white overflow-hidden">
              <div className="absolute inset-0 z-0 opacity-40"></div>
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
                  onClick={() => setStep("intro")}
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
            <div className="p-6 animate-fade-in pb-12 flex-1">
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
                      key={theme.id}
                      onClick={() => handleStartTheme(theme)}
                      className={`w-full text-left bg-white rounded-2xl p-5 border-2 shadow-sm transition-all relative overflow-hidden
                        ${
                          isCompleted
                            ? "border-emerald-300 bg-emerald-50/50"
                            : "border-transparent hover:border-stone-800"
                        }`}
                    >
                      {isCompleted && (
                        <div className="absolute -bottom-4 -right-2 text-emerald-500/10 pointer-events-none">
                          <CheckCircle className="w-24 h-24" />
                        </div>
                      )}

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

                        {isCompleted ? (
                          <div className="flex flex-col items-center justify-center transform rotate-12 bg-white text-emerald-600 px-3 py-1 rounded-full border-2 border-emerald-500 shadow-sm mt-1">
                            <span className="font-black text-[10px] tracking-widest uppercase">
                              Clear
                            </span>
                          </div>
                        ) : (
                          <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-stone-800 mt-2" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: 여정 지도 */}
          {step === "journey" && activeTheme && (
            <div className="p-6 animate-fade-in flex flex-col min-h-full flex-1">
              <div className="mb-5 shrink-0">
                <span className="px-3 py-1 bg-stone-200 text-stone-700 rounded-full text-xs font-bold mb-2 inline-block">
                  {activeTheme.type} • {activeTheme.character}
                </span>
                <h2 className="text-xl font-black mb-1">{activeTheme.title}</h2>
              </div>

              <div className="flex-1 bg-white rounded-2xl p-5 border border-stone-200 shadow-sm overflow-hidden mb-5">
                <div className="flex justify-between items-center mb-5 border-b border-stone-100 pb-3">
                  <h3 className="font-bold text-stone-800 flex items-center gap-2">
                    <Map className="w-5 h-5 text-emerald-600" /> 미션 지도
                  </h3>
                  <span className="text-sm font-bold bg-stone-100 px-3 py-1 rounded-full text-stone-600">
                    {progress} / {activePath.length}
                  </span>
                </div>

                <div className="relative pl-6 space-y-7 max-h-[350px] overflow-y-auto pr-2 pb-4 custom-scrollbar">
                  <div className="absolute top-2 bottom-4 left-[11px] w-0.5 bg-stone-200"></div>
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
                          className={`absolute -left-[30px] w-6 h-6 rounded-full flex items-center justify-center z-10 border-2 bg-white
                          ${
                            isCompleted
                              ? "border-emerald-500 text-emerald-500"
                              : isCurrent && isChoice
                              ? "border-blue-500 text-blue-500 bg-blue-50"
                              : isCurrent
                              ? "border-stone-800 text-stone-800 animate-bounce"
                              : "border-stone-300 text-stone-300"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 fill-current text-white" />
                          ) : isChoice && !isFuture ? (
                            <GitBranch className="w-3 h-3" />
                          ) : isCurrent ? (
                            <Footprints className="w-3 h-3" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-stone-200"></div>
                          )}
                        </div>
                        <div
                          className={`flex-1 ${
                            isCurrent
                              ? (isChoice
                                  ? "bg-blue-50 border-blue-200"
                                  : "bg-stone-50 border-stone-200") +
                                " p-3 rounded-lg border -mt-2"
                              : "-mt-0.5"
                          }`}
                        >
                          <p
                            className={`font-bold ${
                              isCurrent
                                ? "text-stone-900 text-base"
                                : "text-stone-600 text-sm"
                            } flex items-center gap-1`}
                          >
                            {isFuture ? "???" : loc.name}
                            {!isFuture && isChoice && (
                              <GitBranch className="w-3 h-3 text-blue-500" />
                            )}
                            {!isFuture &&
                              idx === activePath.length - 1 &&
                              !isChoice && (
                                <Flag className="w-3 h-3 text-red-500" />
                              )}
                          </p>
                          {isCurrent && !isChoice && (
                            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> 다음 목적지입니다.
                            </p>
                          )}
                          {isCurrent && isChoice && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">
                              선택에 따라 다음 코스가 결정됩니다.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="shrink-0">
                {activePath[progress]?.type === "choice" ? (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm animate-fade-in">
                    <p className="text-center font-bold text-blue-900 mb-3">
                      {activePath[progress].title}
                    </p>
                    <div className="flex flex-col gap-2">
                      {activePath[progress].options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleMakeChoice(opt.route)}
                          className="bg-white border-2 border-blue-200 hover:border-blue-500 text-left p-3 rounded-xl shadow-sm transition-all flex items-center justify-between group"
                        >
                          <div>
                            <span className="font-bold text-blue-900">
                              {opt.label}
                            </span>
                            <span className="block text-xs text-blue-500 mt-0.5">
                              {opt.desc}
                            </span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-blue-300 group-hover:text-blue-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (isQrAuthenticated) {
                        setStep("scene");
                      } else {
                        handleScanQR();
                      }
                    }}
                    className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-stone-800 flex justify-center items-center gap-2 transition-transform active:scale-95"
                  >
                    [{activePath[progress]?.name}]{" "}
                    {isQrAuthenticated
                      ? "도착 확인 (스캔 생략)"
                      : "도착 후 QR 스캔"}{" "}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: QR 스캔 (실제 카메라 구동) */}
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

              <div className="mb-10 mt-6">
                <h2 className="text-xl font-bold mb-2">도착 확인 QR 스캔</h2>
                <p className="text-stone-400 text-xs bg-stone-800 px-4 py-1.5 rounded-full inline-block border border-stone-700">
                  HINT: {activePath[progress].hint}
                </p>
              </div>

              <div
                className={`relative w-64 h-64 bg-black rounded-3xl overflow-hidden mb-12 flex items-center justify-center border-4 shadow-[0_0_60px_rgba(16,185,129,0.15)] transition-colors duration-300
                ${
                  qrErrorMsg
                    ? "border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.3)]"
                    : "border-stone-600"
                }`}
              >
                <QRScanner
                  onScan={(result) => {
                    if (result) handleQRSuccess(result);
                  }}
                  onError={(error) => {
                    console.error("Camera Error:", error);
                  }}
                />

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
                  onClick={handleQRSkip}
                  className="w-full bg-stone-800 hover:bg-stone-700 text-emerald-400 font-bold py-4 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 border border-stone-700 shadow-md"
                >
                  <CheckCircle className="w-4 h-4" /> QR코드 패스하기 (테스트용)
                </button>
                <button
                  onClick={() => setStep("journey")}
                  className="w-full bg-transparent border border-stone-700 text-stone-400 font-bold py-4 rounded-2xl text-sm hover:bg-stone-800 hover:text-white transition-colors"
                >
                  지도 화면으로 돌아가기
                </button>
              </div>
            </div>
          )}

          {/* Step 4: 장면 확인 및 스탬프 */}
          {step === "scene" && (
            <div className="p-6 flex-1 flex flex-col animate-fade-in overflow-y-auto">
              <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-stone-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {activePath[progress].name}
                  </span>
                </div>

                <div className="w-full h-48 bg-stone-100 rounded-xl mb-4 overflow-hidden relative border border-stone-200 flex items-center justify-center">
                  <div className="flex flex-col items-center text-stone-400">
                    <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
                    <span className="text-xs">
                      이곳에 스누피가든 현장 사진이 들어갑니다.
                    </span>
                  </div>
                </div>

                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 mb-4 flex items-start gap-3">
                  <Camera className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-stone-600 font-medium leading-relaxed italic break-keep">
                    {activePath[progress].sceneDesc}
                  </p>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border-l-4 border-emerald-500">
                  <p className="text-emerald-900 font-bold leading-relaxed break-keep">
                    "{activePath[progress].text}"
                  </p>
                </div>
              </div>

              <button
                onClick={handleGetStamp}
                className="w-full mt-auto bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-emerald-700 flex justify-center items-center gap-2 transform active:scale-95 transition-transform shrink-0"
              >
                <CheckCircle className="w-6 h-6" /> 리워드 획득하고 다음으로
              </button>
            </div>
          )}

          {/* Step 5: 최종 목적지 도달 */}
          {step === "complete" && activeTheme && (
            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
              <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center mb-6 relative">
                <CheckCircle className="w-20 h-20 text-emerald-600" />
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1.5 rounded-full rotate-12 shadow-sm">
                  CLEAR!
                </div>
              </div>

              <h2 className="text-3xl font-black text-stone-800 mb-2">
                코스 완주!
              </h2>

              <div className="w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-5 mb-8 text-left">
                <p className="text-center font-bold text-stone-800 mb-4 pb-3 border-b border-stone-100">
                  {activeTheme.completion.title}
                </p>
                <div className="space-y-4">
                  {activeTheme.completion.dialogues.map((dialogue, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        idx % 2 !== 0 ? "items-end" : "items-start"
                      }`}
                    >
                      <span className="text-xs font-bold text-stone-500 mb-1 px-1">
                        {dialogue.speaker}
                      </span>
                      <div
                        className={`p-3 rounded-2xl text-sm font-medium inline-block max-w-[90%] shadow-sm ${
                          idx % 2 === 0
                            ? "bg-stone-100 text-stone-800 rounded-tl-none"
                            : "bg-emerald-50 text-emerald-900 rounded-tr-none"
                        }`}
                      >
                        "{dialogue.text}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {justGotGrandClear ? (
                <button
                  onClick={() => setStep("grandClear")}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-black py-5 rounded-2xl tracking-widest text-sm shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-bounce"
                >
                  ✨ 비글스카우트 대장 스누피가 당신을 찾고 있어요! ✨
                </button>
              ) : (
                <button
                  onClick={resetQuest}
                  className="w-full bg-stone-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-stone-800 mt-auto shrink-0"
                >
                  다른 테마 코스 구경하기
                </button>
              )}
            </div>
          )}

          {/* Step 6: 모든 테마 완주 */}
          {step === "grandClear" && (
            <div className="p-6 flex-1 flex flex-col items-center animate-fade-in h-full bg-stone-900 text-white overflow-y-auto overflow-x-hidden relative">
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
                          "내가 마침내 해냈어!"
                        </p>
                        <span className="block text-[10px] font-normal text-stone-500 mt-2">
                          - 찰리 브라운 (1965.03.30.)
                        </span>
                      </div>
                    </div>
                    <div className="bg-stone-800 p-4 rounded-xl border border-stone-700 flex items-start gap-3 shadow-sm">
                      <Quote className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-stone-200 font-bold text-[13px] leading-relaxed break-keep">
                          "너도 가끔은 쓸모가 있구나, 찰리 브라운!"
                        </p>
                        <span className="block text-[10px] font-normal text-stone-500 mt-2">
                          - 루시 (1959.03.27.)
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
