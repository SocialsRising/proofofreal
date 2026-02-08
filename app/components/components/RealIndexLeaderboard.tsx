import Link from "next/link";

export type RealIndexEntry = {
  rank: number;
  name: string;
  twitter: string;
  avatar: string;
  score: number;
  tagline: string;
};

export const REAL_INDEX_LEADERS: RealIndexEntry[] = [
  {
    rank: 1,
    name: "Luca Netz",
    twitter: "https://x.com/LucaNetz",
    avatar:
      "https://pbs.twimg.com/profile_images/1849498278255071232/drdvg74U_400x400.jpg",
    score: 700,
    tagline: "Hall of Fame Builder",
  },
  {
    rank: 2,
    name: "Jesse Pollak",
    twitter: "https://x.com/jessepollak",
    avatar:
      "https://pbs.twimg.com/profile_images/1879556312822120448/QngrqCSC_400x400.jpg",
    score: 700,
    tagline: "Hall of Fame Builder",
  },
  {
    rank: 3,
    name: "CZ",
    twitter: "https://x.com/cz_binance",
    avatar:
      "https://pbs.twimg.com/profile_images/1961440580279336960/PiiIs8Lh_400x400.jpg",
    score: 700,
    tagline: "Hall of Fame Builder",
  },
  {
    rank: 4,
    name: "Adam Hollander",
    twitter: "https://x.com/HollanderAdam",
    avatar:
      "https://pbs.twimg.com/profile_images/1978417853326909440/rMFjcaFo_400x400.jpg",
    score: 700,
    tagline: "Hall of Fame Builder",
  },
  {
    rank: 5,
    name: "Michael K",
    twitter: "https://x.com/mikashi",
    avatar:
      "https://pbs.twimg.com/profile_images/2011238808574996480/wsksC5BY_400x400.jpg",
    score: 700,
    tagline: "Hall of Fame Builder",
  },
  {
    rank: 6,
    name: "icobeast",
    twitter: "https://x.com/icobeast",
    avatar:
      "https://pbs.twimg.com/profile_images/1610827135978987522/qGWbuvec_400x400.jpg",
    score: 700,
    tagline: "Realest Trendsetter",
  },
  {
    rank: 7,
    name: "ZachXBT",
    twitter: "https://x.com/zachxbt",
    avatar:
      "https://pbs.twimg.com/profile_images/2006489492593455104/7--yA6Jz_400x400.jpg",
    score: 700,
    tagline: "Security Savior",
  },
  {
    rank: 8,
    name: "Gabby Dizon",
    twitter: "https://x.com/gabusch",
    avatar:
      "https://pbs.twimg.com/profile_images/1867525395614248960/tC9Elq7G_400x400.jpg",
    score: 660,
    tagline: "Next Gen Builder",
  },
  {
    rank: 9,
    name: "Greenman",
    twitter: "https://x.com/GreenMan13XYZ",
    avatar:
      "https://pbs.twimg.com/profile_images/1745576587846701058/0TIHdxEw_400x400.jpg",
    score: 655,
    tagline: "Angel Investor Legend",
  },
  {
    rank: 10,
    name: "Dith",
    twitter: "https://x.com/0xDith",
    avatar:
      "https://pbs.twimg.com/profile_images/1899909250731720704/XnNtG1gL_400x400.jpg",
    score: 650,
    tagline: "Next Gen Builder",
  },
  {
    rank: 11,
    name: "Adam FDF",
    twitter: "https://x.com/AdamFDF_",
    avatar:
      "https://pbs.twimg.com/profile_images/1946504670999896064/7cm7sS_V_400x400.jpg",
    score: 650,
    tagline: "Next Gen Builder",
  },
  {
    rank: 12,
    name: "Lamboland",
    twitter: "https://x.com/Lamboland_",
    avatar:
      "https://pbs.twimg.com/profile_images/1847680828144312320/QUJ4DEmp_400x400.png",
    score: 650,
    tagline: "Next Gen Builder",
  },
  {
    rank: 13,
    name: "Serpin Taxt",
    twitter: "https://x.com/serpinxbt",
    avatar:
      "https://pbs.twimg.com/profile_images/1986878850328932352/Ybzp_QKu_400x400.jpg",
    score: 650,
    tagline: "Next Gen Builder",
  },
  {
    rank: 14,
    name: "Gorilla",
    twitter: "https://x.com/CryptoGorilla",
    avatar:
      "https://pbs.twimg.com/profile_images/1983310757186973696/G01dJkKu_400x400.png",
    score: 650,
    tagline: "Real Trendsetter",
  },
  {
    rank: 15,
    name: "threadguy",
    twitter: "https://x.com/notthreadguy",
    avatar:
      "https://pbs.twimg.com/profile_images/1920651894982066176/ssOaEU8k_400x400.jpg",
    score: 650,
    tagline: "Real Trendsetter",
  },
  {
    rank: 16,
    name: "Abhi(APC)",
    twitter: "https://x.com/0xAbhiP",
    avatar:
      "https://pbs.twimg.com/profile_images/1967953057020579840/12Lo4Qpc_400x400.jpg",
    score: 650,
    tagline: "Real Trendsetter",
  },
  {
    rank: 17,
    name: "Kam Punia",
    twitter: "https://x.com/Kam_Punia",
    avatar:
      "https://pbs.twimg.com/profile_images/1710580305847894016/7wpSKSZ8_400x400.jpg",
    score: 650,
    tagline: "Next Gen Builder",
  },
  {
    rank: 18,
    name: "Tyler Guyot",
    twitter: "https://x.com/tyguyot",
    avatar:
      "https://pbs.twimg.com/profile_images/2003114285468114945/HuDB_NOe_400x400.jpg",
    score: 650,
    tagline: "Next Gen Builder",
  },
  {
    rank: 19,
    name: "Jack Dishman",
    twitter: "https://x.com/JackDishman",
    avatar:
      "https://pbs.twimg.com/profile_images/1965735169760829440/_tAtRGA4_400x400.jpg",
    score: 650,
    tagline: "Next Gen Builder",
  },
  {
    rank: 20,
    name: "Linda Xie",
    twitter: "https://x.com/ljxie",
    avatar:
      "https://pbs.twimg.com/profile_images/1667663760994062343/tZKyyd-O_400x400.jpg",
    score: 650,
    tagline: "Next Gen Builder",
  },
  {
    rank: 21,
    name: "Meta Alchemist",
    twitter: "https://x.com/meta_alchemist",
    avatar:
      "https://pbs.twimg.com/profile_images/1994507591704276992/je2xEkZ2_400x400.jpg",
    score: 650,
    tagline: "Next Gen Builder",
  },
  {
    rank: 22,
    name: "Adan Weitsman",
    twitter: "https://x.com/AdamWeitsman",
    avatar:
      "https://pbs.twimg.com/profile_images/1757727379441524736/gX79ae4g_400x400.jpg",
    score: 650,
    tagline: "Next Gen Builder",
  },
  {
    rank: 23,
    name: "Beeple",
    twitter: "https://x.com/beeple",
    avatar:
      "https://pbs.twimg.com/profile_images/264316321/beeple_headshot_beat_up_400x400.jpg",
    score: 650,
    tagline: "Next Gen Builder",
  },
  {
    rank: 24,
    name: "Sovereign",
    twitter: "https://x.com/Sovereign_Web3",
    avatar:
      "https://pbs.twimg.com/profile_images/1759597437906206720/_trDwpUX_400x400.jpg",
    score: 625,
    tagline: "Alpha Overlord",
  },
  {
    rank: 25,
    name: "ole_ti",
    twitter: "https://x.com/oleeeeeee_",
    avatar:
      "https://pbs.twimg.com/profile_images/1991781070459617280/-oePKiGW_400x400.jpg",
    score: 625,
    tagline: "Global Region Leader",
  },
  {
    rank: 26,
    name: "Teng Yan",
    twitter: "https://x.com/tengyanAI",
    avatar:
      "https://pbs.twimg.com/profile_images/1822948258752442368/rqjcPBNB_400x400.jpg",
    score: 600,
    tagline: "Real Trendsetter",
  },
  {
    rank: 27,
    name: "Josh Ong",
    twitter: "https://x.com/beijingdou",
    avatar:
      "https://pbs.twimg.com/profile_images/1602122467002155010/MI7V7cqu_400x400.png",
    score: 575,
    tagline: "Real Trendsetter",
  },
  {
    rank: 28,
    name: "Aiz",
    twitter: "https://x.com/Aizcalibur",
    avatar:
      "https://pbs.twimg.com/profile_images/2012172714522636288/q5L9trQQ_400x400.jpg",
    score: 560,
    tagline: "Real Trendsetter",
  },
  {
    rank: 29,
    name: "Raiden",
    twitter: "https://x.com/raidenkrn",
    avatar:
      "https://pbs.twimg.com/profile_images/1861038105224257536/71yh5-rO_400x400.jpg",
    score: 560,
    tagline: "Real Trendsetter",
  },
  {
    rank: 30,
    name: "Michael Satoshi",
    twitter: "https://x.com/MichaelSatoshi",
    avatar:
      "https://pbs.twimg.com/profile_images/1812919896059060224/vfzMVysf_400x400.jpg",
    score: 550,
    tagline: "Next Gen Builder",
  },
  {
    rank: 31,
    name: "Kevin Beauregard",
    twitter: "https://x.com/KevinBeauregard",
    avatar:
      "https://pbs.twimg.com/profile_images/1771389502449152000/pAtozaSK_400x400.jpg",
    score: 550,
    tagline: "Next Gen Builder",
  },
  {
    rank: 32,
    name: "Jordan Eureka",
    twitter: "https://x.com/JordanEureka_",
    avatar:
      "https://pbs.twimg.com/profile_images/1956200039820234756/QDIPNwuu_400x400.jpg",
    score: 550,
    tagline: "Next Gen Builder",
  },
  {
    rank: 33,
    name: "Kiefer Zang",
    twitter: "https://x.com/KieferZang",
    avatar:
      "https://pbs.twimg.com/profile_images/1955360884777537536/M0MZQlnw_400x400.jpg",
    score: 550,
    tagline: "Next Gen Builder",
  },
  {
    rank: 34,
    name: "Smol Dev",
    twitter: "https://x.com/smoldev__",
    avatar:
      "https://pbs.twimg.com/profile_images/1989558358706180096/gz_-ZdEQ_400x400.jpg",
    score: 550,
    tagline: "Next Gen Builder",
  },
  {
    rank: 35,
    name: "inhuman",
    twitter: "https://x.com/inhuman",
    avatar:
      "https://pbs.twimg.com/profile_images/2005746212025126912/rL0OgQOP_400x400.jpg",
    score: 550,
    tagline: "Next Gen Builder",
  },
  {
    rank: 36,
    name: "MetaBull",
    twitter: "https://x.com/Meta_Bull",
    avatar:
      "https://pbs.twimg.com/profile_images/1662259967104040969/5mQmt98U_400x400.jpg",
    score: 550,
    tagline: "Next Gen Builder",
  },
  {
    rank: 37,
    name: "Elisa",
    twitter: "https://x.com/eeelistar",
    avatar:
      "https://pbs.twimg.com/profile_images/2007063414942932993/9OOhXS2E_400x400.jpg",
    score: 550,
    tagline: "Real Trendsetter",
  },
  {
    rank: 38,
    name: "T.M.A.",
    twitter: "https://x.com/Tma_420",
    avatar:
      "https://pbs.twimg.com/profile_images/2010084327938265088/jVnfTRRT_400x400.jpg",
    score: 550,
    tagline: "Real Trendsetter",
  },
  {
    rank: 39,
    name: "ProofofEly",
    twitter: "https://x.com/ProofOfEly",
    avatar:
      "https://pbs.twimg.com/profile_images/1899824667671576576/RVqjlLdW_400x400.jpg",
    score: 550,
    tagline: "Real Trendsetter",
  },
  {
    rank: 40,
    name: "Brydisanto",
    twitter: "https://x.com/brydisanto",
    avatar:
      "https://pbs.twimg.com/profile_images/1973804307691569152/4m0mOWUc_400x400.jpg",
    score: 550,
    tagline: "Real Trendsetter",
  },
  {
    rank: 41,
    name: "Mike Lau",
    twitter: "https://x.com/mikelauofficial",
    avatar:
      "https://pbs.twimg.com/profile_images/1831494582955339777/Yv-aZBhS_400x400.png",
    score: 550,
    tagline: "Real Trendsetter",
  },
  {
    rank: 42,
    name: "ED3N",
    twitter: "https://x.com/eden_holdings",
    avatar:
      "https://pbs.twimg.com/profile_images/1917597062822330368/vt-dsitH_400x400.jpg",
    score: 550,
    tagline: "Next Gen Builder",
  },
  {
    rank: 43,
    name: "ClumsyKnight",
    twitter: "https://x.com/CLumsyKnight48",
    avatar:
      "https://pbs.twimg.com/profile_images/1997980412748935168/RdTH5Dp8_400x400.jpg",
    score: 550,
    tagline: "REAL Ambassador",
  },
  {
    rank: 44,
    name: "Davuswho",
    twitter: "https://x.com/Davuswho",
    avatar:
      "https://pbs.twimg.com/profile_images/1977855749272285184/Hnet7ydX_400x400.jpg",
    score: 550,
    tagline: "Core Community Contributor",
  },
  {
    rank: 45,
    name: "Tradesgiving",
    twitter: "https://x.com/tradesgiving",
    avatar:
      "https://pbs.twimg.com/profile_images/2002348523405361152/L76RZaxw_400x400.jpg",
    score: 520,
    tagline: "REAL Team",
  },
  {
    rank: 46,
    name: "MrCoolieMoolie",
    twitter: "https://x.com/MrCoolieMoolie",
    avatar:
      "https://pbs.twimg.com/profile_images/1981918269377290240/sFIcmRQb_400x400.jpg",
    score: 515,
    tagline: "Global Region Leader",
  },
  {
    rank: 47,
    name: "cryptoactor",
    twitter: "https://x.com/Crypto_Actor",
    avatar:
      "https://pbs.twimg.com/profile_images/1792320574540464128/zySBKO8Y_400x400.jpg",
    score: 485,
    tagline: "Top Community Supporter",
  },
  {
    rank: 48,
    name: "Web3GameHunters",
    twitter: "https://x.com/web3gamehunters",
    avatar:
      "https://pbs.twimg.com/profile_images/1993833132118704128/zQ-wVvLA_400x400.jpg",
    score: 470,
    tagline: "Core Community Contributor",
  },
  {
    rank: 49,
    name: "Nix",
    twitter: "https://x.com/nix_eth",
    avatar:
      "https://pbs.twimg.com/profile_images/1961995921547526144/z650aTXj_400x400.jpg",
    score: 450,
    tagline: "Real Trendsetter",
  },
  {
    rank: 50,
    name: "NickPlaysCrypto",
    twitter: "https://x.com/NickPlaysCrypto",
    avatar:
      "https://pbs.twimg.com/profile_images/1932450175676514304/mfcvWK8t_400x400.jpg",
    score: 440,
    tagline: "Global Region Leader",
  },
  {
    rank: 51,
    name: "Crusader",
    twitter: "https://x.com/airdropcrusader",
    avatar:
      "https://pbs.twimg.com/profile_images/1964027522296799232/6XrVehH5_400x400.jpg",
    score: 440,
    tagline: "REAL Ambassador",
  },
  {
    rank: 52,
    name: "Nabeel",
    twitter: "https://x.com/gamypto",
    avatar:
      "https://pbs.twimg.com/profile_images/1747679342476615681/A_ku7C0f_400x400.jpg",
    score: 420,
    tagline: "Global Region Leader",
  },
  {
    rank: 53,
    name: "Zatch",
    twitter: "https://x.com/Doingnothing77",
    avatar:
      "https://pbs.twimg.com/profile_images/1949365559641968640/TNh5HXfj_400x400.jpg",
    score: 420,
    tagline: "Top Community Patron",
  },
  {
    rank: 54,
    name: "Toxic55",
    twitter: "https://x.com/ToxiC5501",
    avatar:
      "https://pbs.twimg.com/profile_images/1978922067815804929/jzAGIZkZ_400x400.jpg",
    score: 415,
    tagline: "Global Region Leader",
  },
  {
    rank: 55,
    name: "MasterMurdoch",
    twitter: "https://x.com/TheGodMurdoch",
    avatar:
      "https://pbs.twimg.com/profile_images/1874306422961262592/12BBV5yk_400x400.jpg",
    score: 415,
    tagline: "Global Region Leader",
  },
  {
    rank: 56,
    name: "Marcello",
    twitter: "https://x.com/marcell0x",
    avatar:
      "https://pbs.twimg.com/profile_images/1989782097083445248/-1WOTpmX_400x400.jpg",
    score: 415,
    tagline: "Real Trendsetter",
  },
  {
    rank: 57,
    name: "wasteland",
    twitter: "https://x.com/0xwasteland",
    avatar:
      "https://pbs.twimg.com/profile_images/1993435570077335552/iAK67SDM_400x400.jpg",
    score: 415,
    tagline: "Global Region Leader",
  },
  {
    rank: 58,
    name: "EJR",
    twitter: "https://x.com/EJRWEB3",
    avatar:
      "https://pbs.twimg.com/profile_images/1969851509237030912/GlkuZtGw_400x400.jpg",
    score: 405,
    tagline: "Real Trendsetter",
  },
  {
    rank: 59,
    name: "git",
    twitter: "https://x.com/gitsmol",
    avatar:
      "https://pbs.twimg.com/profile_images/2008616735742558209/peYsdWo-_400x400.jpg",
    score: 405,
    tagline: "Global Region Leader",
  },
  {
    rank: 60,
    name: "Billy the Boss",
    twitter: "https://x.com/billyboyy005",
    avatar:
      "https://pbs.twimg.com/profile_images/1616513061527097344/NsBKhhS6_400x400.jpg",
    score: 405,
    tagline: "Global Region Leader",
  },
  {
    rank: 61,
    name: "Mirror",
    twitter: "https://x.com/mirror_web3",
    avatar:
      "https://pbs.twimg.com/profile_images/1982743723147415552/C4a5QLLO_400x400.jpg",
    score: 405,
    tagline: "Global Region Leader",
  },
  {
    rank: 62,
    name: "Silentmode",
    twitter: "https://x.com/SilentmodeDM",
    avatar:
      "https://pbs.twimg.com/profile_images/1998787903019745280/ufHW-Nzz_400x400.jpg",
    score: 405,
    tagline: "Global Region Leader",
  },
  {
    rank: 63,
    name: "Matheus Celtic",
    twitter: "https://x.com/CelticMatheus",
    avatar:
      "https://pbs.twimg.com/profile_images/1612113998161272832/JZavhz21_400x400.jpg",
    score: 405,
    tagline: "Global Region Leader",
  },
  {
    rank: 64,
    name: "KGlimited",
    twitter: "https://x.com/KG_Limited",
    avatar:
      "https://pbs.twimg.com/profile_images/1768272024965713921/PDA1pTkJ_400x400.jpg",
    score: 405,
    tagline: "Global Region Leader",
  },
  {
    rank: 65,
    name: "Cesar Martinez",
    twitter: "https://x.com/100xCesar",
    avatar:
      "https://pbs.twimg.com/profile_images/1965775048591220736/kl1gnyk0_400x400.jpg",
    score: 405,
    tagline: "Global Region Leader",
  },
  {
    rank: 66,
    name: "Kenni",
    twitter: "https://x.com/RealKennii",
    avatar:
      "https://pbs.twimg.com/profile_images/1799431731612700672/QbArQP5X_400x400.jpg",
    score: 405,
    tagline: "Global Region Leader",
  },
  {
    rank: 67,
    name: "Caleb(FDF)",
    twitter: "https://x.com/calebrebelo_",
    avatar:
      "https://pbs.twimg.com/profile_images/1855982765029605376/e_FoVVhf_400x400.jpg",
    score: 405,
    tagline: "Real Trendsetter",
  },
  {
    rank: 68,
    name: "Mizzy",
    twitter: "https://x.com/mizzysworld",
    avatar:
      "https://pbs.twimg.com/profile_images/1968186790738583552/aSQtayeq_400x400.jpg",
    score: 405,
    tagline: "Real Trendsetter",
  },
  {
    rank: 69,
    name: "Dreadsong",
    twitter: "https://x.com/DreadsongSOL",
    avatar:
      "https://pbs.twimg.com/profile_images/1965016852741906432/s1CxVXYp_400x400.jpg",
    score: 405,
    tagline: "Real Trendsetter",
  },
  {
    rank: 70,
    name: "Iceyyy",
    twitter: "https://x.com/iceyyy_gaming",
    avatar:
      "https://pbs.twimg.com/profile_images/1992900979264471040/aIE3mURf_400x400.jpg",
    score: 405,
    tagline: "Real Trendsetter",
  },
  {
    rank: 71,
    name: "Doug Hype",
    twitter: "https://x.com/DougHype",
    avatar:
      "https://pbs.twimg.com/profile_images/1644042930771095552/IkcJdwHH_400x400.jpg",
    score: 405,
    tagline: "Real Trendsetter",
  },
  {
    rank: 72,
    name: "Hal9000",
    twitter: "https://x.com/neveropendoors",
    avatar:
      "https://pbs.twimg.com/profile_images/1785639783454187520/ESLFFcKy_400x400.jpg",
    score: 400,
    tagline: "Patron from the Shadows",
  },
  {
    rank: 73,
    name: "Curtis Cummings",
    twitter: "https://x.com/curtisjcummings",
    avatar:
      "https://pbs.twimg.com/profile_images/1963408734400413696/xnNpNFat_400x400.png",
    score: 400,
    tagline: "Cracked Dev",
  },
  {
    rank: 74,
    name: "Reborn",
    twitter: "https://x.com/Rebornmf",
    avatar:
      "https://pbs.twimg.com/profile_images/1979203220497895424/35baOL4M_400x400.jpg",
    score: 400,
    tagline: "Ultimate Diamond Hands",
  },
  {
    rank: 75,
    name: "Guywithbrains",
    twitter: "https://x.com/wiredwisely",
    avatar:
      "https://pbs.twimg.com/profile_images/2009338698156969984/UggapXpw_400x400.jpg",
    score: 390,
    tagline: "REAL Ambassador",
  },
  {
    rank: 76,
    name: "kenZaii",
    twitter: "https://x.com/kenZaii7",
    avatar:
      "https://pbs.twimg.com/profile_images/1970778907671695360/6QMGrV4S_400x400.jpg",
    score: 390,
    tagline: "REAL Ambassador",
  },
  {
    rank: 77,
    name: "iQwix",
    twitter: "https://x.com/iiqwiix",
    avatar:
      "https://pbs.twimg.com/profile_images/1959656936128782336/c2gx1Z_t_400x400.jpg",
    score: 390,
    tagline: "REAL Ambassador",
  },
  {
    rank: 78,
    name: "Blake Waddington",
    twitter: "https://x.com/BlakeWaddington",
    avatar:
      "https://pbs.twimg.com/profile_images/1660737787677626375/YPrma7b7_400x400.jpg",
    score: 385,
    tagline: "Global Connector",
  },
  {
    rank: 79,
    name: "bamboeskud",
    twitter: "https://x.com/Bamboeskud",
    avatar:
      "https://pbs.twimg.com/profile_images/1695860612104933376/reNvA-HY_400x400.jpg",
    score: 380,
    tagline: "Core Community Contributor",
  },
  {
    rank: 80,
    name: "Vai",
    twitter: "https://x.com/NFTVai",
    avatar:
      "https://pbs.twimg.com/profile_images/1883726881738088448/tJmKy58T_400x400.png",
    score: 375,
    tagline: "Global Connector",
  },
  {
    rank: 81,
    name: "DrewBleam",
    twitter: "https://x.com/DrewBleam",
    avatar:
      "https://pbs.twimg.com/profile_images/1780623871554568193/GgBFJIy6_400x400.jpg",
    score: 375,
    tagline: "Global Connector",
  },
  {
    rank: 82,
    name: "Kearneyy",
    twitter: "https://x.com/kearneyy",
    avatar:
      "https://pbs.twimg.com/profile_images/1841111765318324225/KGQXoNkW_400x400.jpg",
    score: 375,
    tagline: "Global Connector",
  },
  {
    rank: 83,
    name: "Ghost",
    twitter: "https://x.com/ghostdotxyz",
    avatar:
      "https://pbs.twimg.com/profile_images/2000998115889790977/y3oqnYlb_400x400.jpg",
    score: 375,
    tagline: "Global Connector",
  },
  {
    rank: 84,
    name: "Raj(ABS)",
    twitter: "https://x.com/Rajp_14",
    avatar:
      "https://pbs.twimg.com/profile_images/1899840185925337088/2g_uarj5_400x400.jpg",
    score: 375,
    tagline: "Global Connector",
  },
  {
    rank: 85,
    name: "Web3 Wesley",
    twitter: "https://x.com/Web3Wesley",
    avatar:
      "https://pbs.twimg.com/profile_images/1432968248828444672/hpMREgwC_400x400.jpg",
    score: 375,
    tagline: "Global Connector",
  },
  {
    rank: 86,
    name: "NB(APC)",
    twitter: "https://x.com/0xNB9",
    avatar:
      "https://pbs.twimg.com/profile_images/1926584582570131458/2TyXV12K_400x400.jpg",
    score: 375,
    tagline: "Global Connector",
  },
  {
    rank: 87,
    name: "Betapluxx",
    twitter: "https://x.com/betapluxx",
    avatar:
      "https://pbs.twimg.com/profile_images/1950578290395414528/Iu5Z5O_L_400x400.jpg",
    score: 375,
    tagline: "Global Connector",
  },
  {
    rank: 88,
    name: "Favourrr",
    twitter: "https://x.com/Feyvve",
    avatar:
      "https://pbs.twimg.com/profile_images/1984538138706927616/JtOzGYz0_400x400.jpg",
    score: 375,
    tagline: "REAL Ambassador",
  },
  {
    rank: 89,
    name: "Yorks",
    twitter: "https://x.com/generativepoet",
    avatar:
      "https://pbs.twimg.com/profile_images/1996266043140935680/DFdQ0v7H_400x400.png",
    score: 365,
    tagline: "Patron from the Shadows",
  },
  {
    rank: 90,
    name: "elev8blyss",
    twitter: "https://x.com/bholc646",
    avatar:
      "https://pbs.twimg.com/profile_images/1786635520715669504/iRbCv_dg_400x400.jpg",
    score: 365,
    tagline: "Patron from the Shadows",
  },
  {
    rank: 91,
    name: "Matt Force",
    twitter: "https://x.com/Mattforce",
    avatar:
      "https://pbs.twimg.com/profile_images/1969897830702841856/tHYkY7T3_400x400.jpg",
    score: 360,
    tagline: "Core Community Contributor",
  },
  {
    rank: 92,
    name: "Wale246",
    twitter: "https://x.com/Wale246",
    avatar:
      "https://pbs.twimg.com/profile_images/1852544145073618945/4q1xev8d_400x400.jpg",
    score: 360,
    tagline: "REAL Team",
  },
  {
    rank: 93,
    name: "Azeem",
    twitter: "https://x.com/Dar_yhor",
    avatar:
      "https://pbs.twimg.com/profile_images/1765332888591998979/9tBl1R6v_400x400.jpg",
    score: 360,
    tagline: "REAL Team",
  },
  {
    rank: 94,
    name: "HeliusTheApe",
    twitter: "https://x.com/heliustheape",
    avatar:
      "https://pbs.twimg.com/profile_images/1928191008917049347/3pZG6iWh_400x400.jpg",
    score: 360,
    tagline: "REAL Team",
  },
  {
    rank: 95,
    name: "pirateoneth",
    twitter: "https://x.com/PIRATE_ON_ETH",
    avatar:
      "https://pbs.twimg.com/profile_images/1982839388640849920/tMUYPYfl_400x400.jpg",
    score: 360,
    tagline: "Core Community Contributor",
  },
  {
    rank: 96,
    name: "Berna",
    twitter: "https://x.com/Berna7224",
    avatar:
      "https://pbs.twimg.com/profile_images/1919551425102688256/L7kjXx9w_400x400.jpg",
    score: 355,
    tagline: "Active Creator",
  },
  {
    rank: 97,
    name: "Prometheus",
    twitter: "https://x.com/just_prome",
    avatar:
      "https://pbs.twimg.com/profile_images/1901976149854662656/kK5XF2uK_400x400.jpg",
    score: 355,
    tagline: "Core Community Contributor",
  },
  {
    rank: 98,
    name: "John Kim",
    twitter: "https://x.com/jkim00x3",
    avatar:
      "https://pbs.twimg.com/profile_images/1712862857539563520/NiPbWKCC_400x400.jpg",
    score: 355,
    tagline: "Alpha Overlord",
  },
  {
    rank: 99,
    name: "DanisNearby",
    twitter: "https://x.com/DanIsNearby",
    avatar:
      "https://pbs.twimg.com/profile_images/1517245211264573448/zGE-aSYZ_400x400.png",
    score: 355,
    tagline: "Cracked Dev",
  },
  {
    rank: 100,
    name: "Sauciii",
    twitter: "https://x.com/sauciii",
    avatar:
      "https://pbs.twimg.com/profile_images/2005442514832986112/ysWrbUG4_400x400.jpg",
    score: 355,
    tagline: "Community Cultivator",
  },
  {
    rank: 101,
    name: "Enryu",
    twitter: "https://x.com/Enryu_gfh",
    avatar:
      "https://pbs.twimg.com/profile_images/2004799210802294784/yUBzH74i_400x400.jpg",
    score: 355,
    tagline: "Global Region Leader",
  },
  {
    rank: 102,
    name: "Eliph",
    twitter: "https://x.com/Eliph_Liztator",
    avatar:
      "https://pbs.twimg.com/profile_images/1708182660164583424/w7Le8nss_400x400.jpg",
    score: 355,
    tagline: "Global Region Leader",
  },
  {
    rank: 103,
    name: "Jojo",
    twitter: "https://x.com/JOJO_cryptoinfo",
    avatar:
      "https://pbs.twimg.com/profile_images/1900399361387094017/Yc6dJ4nI_400x400.jpg",
    score: 355,
    tagline: "Global Region Leader",
  },
  {
    rank: 104,
    name: "PhenomeN",
    twitter: "https://x.com/phenomen_games",
    avatar:
      "https://pbs.twimg.com/profile_images/1940008662468046850/b0_jnTEB_400x400.jpg",
    score: 355,
    tagline: "Global Region Leader",
  },
  {
    rank: 105,
    name: "Milca0",
    twitter: "https://x.com/Milca0_",
    avatar:
      "https://pbs.twimg.com/profile_images/1991933213934047232/zRVzBG2A_400x400.jpg",
    score: 355,
    tagline: "Global Region Leader",
  },
  {
    rank: 106,
    name: "Ruddch",
    twitter: "https://x.com/Neiniciativ",
    avatar:
      "https://pbs.twimg.com/profile_images/1980234323333709824/xSE6lPcJ_400x400.jpg",
    score: 355,
    tagline: "Cracked Dev",
  },
  {
    rank: 107,
    name: "Boxer",
    twitter: "https://x.com/Boxerr110",
    avatar:
      "https://pbs.twimg.com/profile_images/2006841215556419584/aFgNrR_T_400x400.jpg",
    score: 320,
    tagline: "Active Community Supporter",
  },
  {
    rank: 108,
    name: "Martingas",
    twitter: "https://x.com/Martin_G_Edits",
    avatar:
      "https://pbs.twimg.com/profile_images/1873792035922251776/HyOKVLBn_400x400.jpg",
    score: 305,
    tagline: "REAL Ambassador",
  },
  {
    rank: 109,
    name: "Juanito",
    twitter: "https://x.com/xjuanito",
    avatar:
      "https://pbs.twimg.com/profile_images/1726366065058525184/SO_fQ-8x_400x400.jpg",
    score: 300,
    tagline: "Global Connector",
  },
  {
    rank: 110,
    name: "CS_Bocky",
    twitter: "https://x.com/CS_Bocky",
    avatar:
      "https://pbs.twimg.com/profile_images/1833279510873079808/8Po2ptST_400x400.png",
    score: 300,
    tagline: "Active Community Supporter",
  },
  {
    rank: 111,
    name: "Swolesome",
    twitter: "https://x.com/swolesome",
    avatar:
      "https://pbs.twimg.com/profile_images/1595796506103144449/f737bqVA_400x400.jpg",
    score: 300,
    tagline: "Active Community Supporter",
  },
  {
    rank: 112,
    name: "Hasanwaifu",
    twitter: "https://x.com/hasanwaifu",
    avatar:
      "https://pbs.twimg.com/profile_images/1947850265841045504/_cqQ09R5_400x400.jpg",
    score: 300,
    tagline: "Active Creator",
  },
  {
    rank: 113,
    name: "Strawhatg3",
    twitter: "https://x.com/StrawHatG3",
    avatar:
      "https://pbs.twimg.com/profile_images/1944822830639800321/ah4hZxrw_400x400.jpg",
    score: 300,
    tagline: "Active Creator",
  },
  {
    rank: 114,
    name: "Enissay",
    twitter: "https://x.com/Enissay",
    avatar:
      "https://pbs.twimg.com/profile_images/2000918858597629963/wmQoxnp__400x400.jpg",
    score: 300,
    tagline: "Active Creator",
  },
  {
    rank: 115,
    name: "akts",
    twitter: "https://x.com/oyasumiaoit",
    avatar:
      "https://pbs.twimg.com/profile_images/1944718421381242880/ym_yJHt4_400x400.jpg",
    score: 300,
    tagline: "Active Creator",
  },
  {
    rank: 116,
    name: "WhiteDuke",
    twitter: "https://x.com/WhiteeDuke",
    avatar:
      "https://pbs.twimg.com/profile_images/1985702117076525056/Zy6F660D_400x400.jpg",
    score: 300,
    tagline: "REAL Ambassador",
  },
  {
    rank: 117,
    name: "knightrider",
    twitter: "https://x.com/sctrackboy",
    avatar:
      "https://pbs.twimg.com/profile_images/1587229295809806339/eLhVwZ7h_400x400.jpg",
    score: 300,
    tagline: "Patron from the Shadows",
  },
  {
    rank: 118,
    name: "Pinkz",
    twitter: "https://x.com/Pinkz2903",
    avatar:
      "https://pbs.twimg.com/profile_images/1820406154520047616/eB4XxoVE_400x400.jpg",
    score: 300,
    tagline: "Global Region Leader",
  },
  {
    rank: 119,
    name: "Jahseh Kaeo",
    twitter: "https://x.com/kaeo_says",
    avatar:
      "https://pbs.twimg.com/profile_images/1974149825114316800/pOSmpLfG_400x400.jpg",
    score: 300,
    tagline: "Core Community Supporter",
  },
  {
    rank: 120,
    name: "Aziat_Dikiy",
    twitter: "https://x.com/Aziat_Dikiy",
    avatar:
      "https://pbs.twimg.com/profile_images/1987534916221808640/U2T85Zq__400x400.jpg",
    score: 295,
    tagline: "Core Community Supporter",
  },
  {
    rank: 121,
    name: "Alin3x",
    twitter: "https://x.com/0xAlin3x",
    avatar:
      "https://pbs.twimg.com/profile_images/1944822699571769344/Erx_lKIW_400x400.jpg",
    score: 295,
    tagline: "Core Community Supporter",
  },
  {
    rank: 122,
    name: "Archivum",
    twitter: "https://x.com/archivum_saves",
    avatar:
      "https://pbs.twimg.com/profile_images/1961754269779992576/9iabtJYV_400x400.jpg",
    score: 295,
    tagline: "Core Community Supporter",
  },
  {
    rank: 123,
    name: "DgtlTrophies",
    twitter: "https://x.com/DgtlTrophies",
    avatar:
      "https://pbs.twimg.com/profile_images/1971753493183471617/dlJ527Ms_400x400.jpg",
    score: 285,
    tagline: "Active Community Supporter",
  },
  {
    rank: 124,
    name: "Dpuck",
    twitter: "https://x.com/Nfts4bob",
    avatar:
      "https://pbs.twimg.com/profile_images/2010571239316725760/aE2v8Rv9_400x400.jpg",
    score: 280,
    tagline: "Active Community Supporter",
  },
  {
    rank: 125,
    name: "Winty",
    twitter: "https://x.com/Winty_ron",
    avatar:
      "https://pbs.twimg.com/profile_images/1945169680815017984/PDI7LboK_400x400.jpg",
    score: 275,
    tagline: "Active Community Supporter",
  },
  {
    rank: 126,
    name: "LordArgo",
    twitter: "https://x.com/ArgoLord",
    avatar:
      "https://pbs.twimg.com/profile_images/1779409519845515265/bhPySKr6_400x400.jpg",
    score: 275,
    tagline: "Active Community Supporter",
  },
  {
    rank: 127,
    name: "Xang Zhong",
    twitter: "https://x.com/XangZhong",
    avatar:
      "https://pbs.twimg.com/profile_images/1649567398905942016/Cpfg9xnL_400x400.jpg",
    score: 275,
    tagline: "Active Community Supporter",
  },
  {
    rank: 128,
    name: "Method Five",
    twitter: "https://x.com/method_five",
    avatar:
      "https://pbs.twimg.com/profile_images/1773910528479383552/Ks2hi0Mm_400x400.jpg",
    score: 275,
    tagline: "Active Community Supporter",
  },
  {
    rank: 129,
    name: "Tacolauncher",
    twitter: "https://x.com/0xtacolauncher",
    avatar:
      "https://pbs.twimg.com/profile_images/1859648699644653568/_eByQjhf_400x400.jpg",
    score: 275,
    tagline: "Active Community Supporter",
  },
  {
    rank: 130,
    name: "LeafTrades",
    twitter: "https://x.com/LeafTrades",
    avatar:
      "https://pbs.twimg.com/profile_images/1996769327077261312/vTyiWVYW_400x400.jpg",
    score: 275,
    tagline: "Active Community Supporter",
  },
  {
    rank: 131,
    name: "Jaycean",
    twitter: "https://x.com/theonlyjaycean",
    avatar:
      "https://pbs.twimg.com/profile_images/1995512920885657600/FdZmok8i_400x400.jpg",
    score: 260,
    tagline: "Active Community Supporter",
  },
  {
    rank: 132,
    name: "coffeeshark",
    twitter: "https://x.com/sam_loga",
    avatar:
      "https://pbs.twimg.com/profile_images/1934646010799607808/9ZiQJqIO_400x400.jpg",
    score: 255,
    tagline: "Active Community Supporter",
  },
  {
    rank: 133,
    name: "Samwise",
    twitter: "https://x.com/Jpegss",
    avatar:
      "https://pbs.twimg.com/profile_images/2003161738137731073/K4ZO84P8_400x400.jpg",
    score: 250,
    tagline: "Real Supporter",
  },
  {
    rank: 134,
    name: "Divljo",
    twitter: "https://x.com/Divljo31",
    avatar:
      "https://pbs.twimg.com/profile_images/1724230361167626240/pD6c6AF1_400x400.jpg",
    score: 250,
    tagline: "Active Community Supporter",
  },
  {
    rank: 135,
    name: "Eric Zalusky",
    twitter: "https://x.com/ericzalusky",
    avatar:
      "https://pbs.twimg.com/profile_images/1889472725590151170/yxWe5SrP_400x400.jpg",
    score: 250,
    tagline: "Active Community Supporter",
  },
  {
    rank: 136,
    name: "Innodiablo",
    twitter: "https://x.com/InnoDiablo",
    avatar:
      "https://pbs.twimg.com/profile_images/1978764273238052864/jFzzaxBK_400x400.jpg",
    score: 250,
    tagline: "Active Community Supporter",
  },
  {
    rank: 137,
    name: "April Zoe",
    twitter: "https://x.com/aprilzoe",
    avatar:
      "https://pbs.twimg.com/profile_images/1978835036263661569/2g8jhYBM_400x400.jpg",
    score: 250,
    tagline: "Active Community Supporter",
  },
  {
    rank: 138,
    name: "Elvhari",
    twitter: "https://x.com/elvhari",
    avatar:
      "https://pbs.twimg.com/profile_images/2006399824305025024/T-Td5eY4_400x400.jpg",
    score: 250,
    tagline: "Active Community Supporter",
  },
  {
    rank: 139,
    name: "Jame",
    twitter: "https://x.com/Jamewowpro",
    avatar:
      "https://pbs.twimg.com/profile_images/1978077362185994240/VrKKPKDS_400x400.jpg",
    score: 250,
    tagline: "Active Community Supporter",
  },
  {
    rank: 140,
    name: "Yeesha",
    twitter: "https://x.com/unique_yeesha",
    avatar:
      "https://pbs.twimg.com/profile_images/1883584676301832193/mxDTHnl8_400x400.jpg",
    score: 245,
    tagline: "Active Creator",
  },
  {
    rank: 141,
    name: "Skullcrusher",
    twitter: "https://x.com/luckyccs",
    avatar:
      "https://pbs.twimg.com/profile_images/1976193924931649537/nYkHqQBz_400x400.jpg",
    score: 215,
    tagline: "Active Community Supporter",
  },
  {
    rank: 142,
    name: "TripleA",
    twitter: "https://x.com/triplea01117?s=21",
    avatar:
      "https://pbs.twimg.com/profile_images/2010446062574522368/GcQgNnuP_400x400.jpg",
    score: 215,
    tagline: "Active Community Supporter",
  },
  {
    rank: 143,
    name: "Gigafisher",
    twitter: "https://x.com/gigaf1sher",
    avatar:
      "https://pbs.twimg.com/profile_images/1974991985070022656/2q_wQ75C_400x400.jpg",
    score: 200,
    tagline: "Active Community Supporter",
  },
  {
    rank: 144,
    name: "MPHST",
    twitter: "https://x.com/mphst_",
    avatar:
      "https://pbs.twimg.com/profile_images/1993481469717630976/eMCE6hnT_400x400.jpg",
    score: 200,
    tagline: "Active Community Supporter",
  },
  {
    rank: 145,
    name: "Shasan",
    twitter: "https://x.com/shasan2101",
    avatar:
      "https://pbs.twimg.com/profile_images/1677701137888100354/ieVC3lV4_400x400.jpg",
    score: 200,
    tagline: "Active Community Supporter",
  },
  {
    rank: 146,
    name: "Lehson",
    twitter: "https://x.com/Lehson1",
    avatar:
      "https://pbs.twimg.com/profile_images/1991006305549787136/kdqdmDZs_400x400.jpg",
    score: 200,
    tagline: "Active Community Supporter",
  },
  {
    rank: 147,
    name: "Icefrost",
    twitter: "https://x.com/IceFrosst",
    avatar:
      "https://pbs.twimg.com/profile_images/1985656716369801216/mkOlZ0KA_400x400.jpg",
    score: 200,
    tagline: "Active Community Supporter",
  },
  {
    rank: 148,
    name: "Ekaterina",
    twitter: "https://x.com/elfy_411",
    avatar:
      "https://pbs.twimg.com/profile_images/1941885232572981249/MCvSrabr_400x400.jpg",
    score: 200,
    tagline: "Active Community Supporter",
  },
  {
    rank: 149,
    name: "Vinsil",
    twitter: "https://x.com/0xVinsil",
    avatar:
      "https://pbs.twimg.com/profile_images/1993939447352844288/xGPfLo_f_400x400.jpg",
    score: 200,
    tagline: "Active Community Supporter",
  },
  {
    rank: 150,
    name: "NotTino",
    twitter: "https://x.com/web3tino",
    avatar:
      "https://pbs.twimg.com/profile_images/1953198143631228928/qqcdOTr-_400x400.jpg",
    score: 185,
    tagline: "Active Community Supporter",
  },
  {
    rank: 151,
    name: "Hojo",
    twitter: "https://x.com/Hojo_NG",
    avatar:
      "https://pbs.twimg.com/profile_images/1918736608632754176/3iDdQk5v_400x400.jpg",
    score: 165,
    tagline: "Active Community Supporter",
  },
  {
    rank: 152,
    name: "Akimitsu",
    twitter: "https://x.com/Akimistuu",
    avatar:
      "https://pbs.twimg.com/profile_images/2013537893596160001/K_CoEh_7_400x400.jpg",
    score: 155,
    tagline: "Active Community Supporter",
  },
  {
    rank: 153,
    name: "Radiant",
    twitter: "https://x.com/Radiant_Eidolon",
    avatar:
      "https://pbs.twimg.com/profile_images/2012638200481689601/Eu8M2ybR_400x400.jpg",
    score: 150,
    tagline: "Active Community Supporter",
  },
  {
    rank: 154,
    name: "Topman77z",
    twitter: "https://x.com/Topman77z0",
    avatar:
      "https://pbs.twimg.com/profile_images/1953786844597866496/m2R_wmkl_400x400.jpg",
    score: 150,
    tagline: "Active Community Supporter",
  },
  {
    rank: 155,
    name: "Becca",
    twitter: "https://x.com/justbehkah",
    avatar:
      "https://pbs.twimg.com/profile_images/1956058912504901633/2pYG2Guc_400x400.jpg",
    score: 125,
    tagline: "Active Community Supporter",
  },
  {
    rank: 156,
    name: "Meta Maven",
    twitter: "https://x.com/Meta_maven0",
    avatar:
      "https://pbs.twimg.com/profile_images/2006535187929124864/JWrpane-_400x400.jpg",
    score: 120,
    tagline: "Active Community Supporter",
  },
  {
    rank: 157,
    name: "BCJ",
    twitter: "https://x.com/itsbcj",
    avatar:
      "https://pbs.twimg.com/profile_images/1994705678162698240/aaJPBDjJ_400x400.jpg",
    score: 110,
    tagline: "Active Community Supporter",
  },
  {
    rank: 158,
    name: "Luffy",
    twitter: "https://x.com/Luffy_tomm",
    avatar:
      "https://pbs.twimg.com/profile_images/1948148546328297472/eoIcXTH1_400x400.jpg",
    score: 110,
    tagline: "Active Community Supporter",
  },
];

function medalForRank(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function pillForTagline(tagline: string) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-none";
  const t = tagline.toLowerCase();

  if (t.includes("hall of fame"))
    return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`;
  if (t.includes("realest"))
    return `${base} border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200`;
  if (t.includes("ambassador"))
    return `${base} border-indigo-400/30 bg-indigo-400/10 text-indigo-200`;
  if (t.includes("team"))
    return `${base} border-sky-400/30 bg-sky-400/10 text-sky-200`;
  if (t.includes("overlord"))
    return `${base} border-rose-400/30 bg-rose-400/10 text-rose-200`;
  if (t.includes("connector"))
    return `${base} border-amber-400/30 bg-amber-400/10 text-amber-200`;
  if (t.includes("trendsetter"))
    return `${base} border-teal-400/30 bg-teal-400/10 text-teal-200`;
  if (t.includes("cracked dev"))
    return `${base} border-violet-400/30 bg-violet-400/10 text-violet-200`;
  if (t.includes("patron"))
    return `${base} border-slate-500/40 bg-slate-800/40 text-slate-200`;

  return `${base} border-slate-700 bg-slate-900/60 text-slate-300`;
}

export default function RealIndexLeaderboard() {
  const topScore = Math.max(...REAL_INDEX_LEADERS.map((e) => e.score));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top glow / gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-40 left-1/4 h-[380px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-40 left-3/4 h-[380px] w-[520px] -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <section className="px-4 py-10 md:px-8">
        <div className="max-w-5xl mx-auto">
          <header className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
              <span className="text-emerald-300">●</span>
              Live leaderboard snapshot
            </div>

            <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight">
              REAL Index Leaderboard
            </h1>

            <p className="mt-2 text-sm md:text-base text-slate-400 max-w-2xl">
              Builders, creators, and community leaders shaping the on-chain
              future — ranked by Real Index Score.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1">
                Entries:{" "}
                <span className="text-slate-200">
                  {REAL_INDEX_LEADERS.length}
                </span>
              </span>
              <span className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1">
                Top score: <span className="text-emerald-300">{topScore}</span>
              </span>
              <span className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1">
                Updated: <span className="text-slate-200">This week</span>
              </span>
            </div>
          </header>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl overflow-hidden">
            {/* Sticky header */}
            <div className="sticky top-0 z-10 grid grid-cols-[3.2rem,auto,5.2rem] md:grid-cols-[3.2rem,2fr,1.35fr,5.2rem] px-4 py-3 text-xs md:text-sm font-semibold text-slate-400 border-b border-slate-800 bg-slate-950/70 backdrop-blur">
              <span>#</span>
              <span>Name</span>
              <span className="hidden md:inline">Tagline</span>
              <span className="text-right">Score</span>
            </div>

            <ul className="divide-y divide-slate-800">
              {REAL_INDEX_LEADERS.map((entry) => {
                const medal = medalForRank(entry.rank);
                const isTop = entry.rank <= 3;

                return (
                  <li
                    key={entry.rank}
                    className={[
                      "px-4 py-3 flex items-center gap-3 text-xs md:text-sm transition",
                      "hover:bg-slate-900/70",
                      isTop ? "bg-slate-900/35" : "",
                    ].join(" ")}
                  >
                    <span className="w-10 text-slate-400 font-semibold">
                      {medal ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-base">{medal}</span>
                          <span className="sr-only">{entry.rank}</span>
                        </span>
                      ) : (
                        entry.rank
                      )}
                    </span>

                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      <div
                        className={[
                          "relative w-10 h-10 rounded-full overflow-hidden border",
                          isTop
                            ? "border-emerald-400/40 shadow-[0_0_0_3px_rgba(16,185,129,0.08)]"
                            : "border-slate-700",
                        ].join(" ")}
                      >
                        <img
                          src={entry.avatar}
                          alt={entry.name}
                          className="w-10 h-10 object-cover"
                          loading="lazy"
                        />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <Link
                          href={entry.twitter}
                          target="_blank"
                          className="font-medium hover:text-emerald-300 transition truncate"
                          title={entry.name}
                        >
                          {entry.name}
                        </Link>

                        <span className="md:hidden mt-1">
                          <span className={pillForTagline(entry.tagline)}>
                            {entry.tagline}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="hidden md:flex flex-1 justify-start">
                      <span className={pillForTagline(entry.tagline)}>
                        {entry.tagline}
                      </span>
                    </div>

                    <span className="w-16 text-right font-semibold">
                      <span className="text-emerald-300">{entry.score}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Footer Links — from welcome page */}
          <footer className="mt-16 mb-4 text-xs text-slate-500 flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-4 text-[12px]">
              <a
                href="https://x.com/proofofreal"
                target="_blank"
                className="hover:text-emerald-400 transition"
                rel="noreferrer"
              >
                Twitter / X
              </a>
              <a
                href="https://discord.gg/krVPuyksQy"
                target="_blank"
                className="hover:text-emerald-400 transition"
                rel="noreferrer"
              >
                Discord
              </a>
              <a
                href="https://medium.com/@tradesgiving"
                target="_blank"
                className="hover:text-emerald-400 transition"
                rel="noreferrer"
              >
                Medium
              </a>
              <a
                href="https://opensea.io/collection/the-hopeful-"
                target="_blank"
                className="hover:text-emerald-400 transition"
                rel="noreferrer"
              >
                NFT Collection
              </a>
              <a
                href="https://clanker.world/clanker/0x8Ce6779DaE5bf8a1319168e763fcED44C5220B07"
                target="_blank"
                className="hover:text-emerald-400 transition"
                rel="noreferrer"
              >
                $HOPE Trading
              </a>
              <a
                href="https://portal.abs.xyz/trade?buy=0x532988fc8be76af7439de4bcaacc7707660ea3e6&showBars=true&showHistory=true"
                target="_blank"
                className="hover:text-emerald-400 transition"
                rel="noreferrer"
              >
                $FAKE Trading
              </a>
            </div>

            <p>© {new Date().getFullYear()} Proof of Real • Socials Rising</p>
          </footer>
        </div>
      </section>
    </main>
  );
}
