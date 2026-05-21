import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ════════════════════════════════════════════════════════════════════════
   MINTFORGE  •  v2  •  refined dark-fantasy codex
   ────────────────────────────────────────────────────────────────────────
   This file is the main app shell — auth gate, top bar, screen routing,
   shared state, and the bottom nav. Each major screen still lives inline
   in this component (planned: split into screens/Hunt.jsx etc.).

   Imports are grouped by destination:
   ─ lib/      pure logic (theme, data, coin, api)
   ─ hooks/    reusable hooks
   ─ components/   reusable + leaf UI components
   ──────────────────────────────────────────────────────────────────────── */

// Theme + data
import { DARK, LIGHT } from "./lib/theme.js";
import {
  METALS, MAX_TIER, SHAPES, SHAPE_NAMES, CONS, VOWS, ERAS, EPOCH, HOUSES, CONDS,
  TITLES, TITLE_LEVELS,
  RARITIES, MAX_RARITY, RARITY_COLOR,
  BANNERS, FRAMES, bannerStyle,
  ARTEFACTS, ARTEFACT_GRADES, ARTEFACT_FORGE_COST,
  PREMIUM_TITLES, PREMIUM_TITLE_BY_ID, PREMIUM_TITLE_LABELS,
  SHOVEL_UPS, SHOVEL_TIER_CAP, SHOVEL_MAX_DUR,
  BRUSH_UPS, BA, MAX_SH, MAX_BR,
  TAROT_CARDS, TAROT_BY_ID, MAX_EQUIPPED_TAROTS,
  GRID,
  SENSE_PHRASES,
} from "./lib/data.js";

// Coin logic + economy
import {
  RNG, rune, mkCoin, newSeed, drawCoin,
  pickMetal, genFace,
  lvl, lvlMin, lvlMax,
  deriveRarity, rollRarity, coinRarity, rarityScore, coinValue, vaultMarks,
  gradeForRaritySum, shovelMaxDur, repairCost,
  tarotBuffs, unlockedTitles, senseLevel,
  GAMBLES,
} from "./lib/coin.js";

// API + hooks
import { apiClient, API_BASE, TOKEN_KEY } from "./lib/api.js";
import { useDebouncedEffect } from "./hooks/index.js";
import { GameContext } from "./lib/GameContext.js";

// Screens
import Vault from "./screens/Vault.jsx";
import Shrine from "./screens/Shrine.jsx";
// Old Hunt screen (sweep + signal + 4×4 dig grid) replaced by HuntSideScroller.
// IdleField is a comfy-idle demo of a new direction — pastel cats-and-soup
// vibe with a single mine + cat + procedural coin pulls. Swap which import
// the `Hunt` symbol points at to flip between the two:
import Hunt from "./screens/IdleField.jsx";
// import Hunt from "./screens/HuntSideScroller.jsx";  // ← old skeleton scroller
import Profile from "./screens/Profile.jsx";
import Social from "./screens/Social.jsx";

// Components
import CoinCanvas    from "./components/CoinCanvas.jsx";
import Particles     from "./components/Particles.jsx";
import LuckyFanfare  from "./components/LuckyFanfare.jsx";
import DigPit        from "./components/DigPit.jsx";
import ShovelIcon    from "./components/ShovelIcon.jsx";
import BottomNav     from "./components/BottomNav.jsx";
import MarksCounter  from "./components/MarksCounter.jsx";
import AuthScreen    from "./components/AuthScreen.jsx";

export default function MintForge(){
  /* ── auth layer ─────────────────────────────────────────────── */
  const[token,setToken]=useState(()=>{try{return localStorage.getItem(TOKEN_KEY);}catch{return null;}});
  const[player,setPlayer]=useState(null);
  const[authReady,setAuthReady]=useState(false);
  const[loadErr,setLoadErr]=useState(null);
  const[retryCounter,setRetryCounter]=useState(0); // bump to retry vault fetch
  const api=useMemo(()=>apiClient(token),[token]);
  const[loadedFromServer,setLoadedFromServer]=useState(false);
  const [isDark,setIsDark]=useState(true);
  const t=isDark?DARK:LIGHT;

  // Sync isDark to <html class="dark"> so Tailwind's dark: variants work
  // in tandem with the legacy `t` object. This is the dual-track theme
  // approach — components converted to Tailwind use `dark:` variants;
  // unconverted components still read `t.X`. Both stay in sync.
  useEffect(()=>{
    const root=document.documentElement;
    if(isDark)root.classList.add("dark");
    else root.classList.remove("dark");
  },[isDark]);

  const [coins,setCoins]=useState([]);
  const [xp,setXP]=useState(0);
  const [tab,setTab]=useState("hunt");

  // Redirect away from hidden tabs. Shrine is hidden from nav until the
  // altar mechanic + artefact rework lands — but state may persist from
  // localStorage / a prior session, so guard explicitly here.
  useEffect(()=>{ if(tab==="shrine")setTab("hunt"); },[tab]);

  const [frame,setFrame]=useState("stone");
  const [filter,setFilter]=useState(-1);
  const [pinnedIds,setPinnedIds]=useState(null);
  const [shovelLevel,setShovelLevel]=useState(1);
  const [brushLevel,setBrushLevel]=useState(0);
  const [marks,setMarks]=useState(0);
  const [shovelDur,setShovelDur]=useState(40);
  const [hangedManUsed,setHangedManUsed]=useState(false); // resets on each successful coin found
  // Wheel of Fortune: counts finds since last guaranteed Rare+ trigger.
  // Resets to 0 after a guaranteed find. Persisted so it survives reloads.
  const [findStreak,setFindStreak]=useState(0);
  // Hanged Man: daily reroll usage. Stores ISO date string of last use.
  const [hangedManDate,setHangedManDate]=useState("");
  // Ore counters — one per metal (length 9). Filled by skeleton kills in
  // HuntSideScroller, drained by claimOreCoin. Persisted to D1 via vault POST.
  // Resilient to missing-migration: starts as zeros, loaded from server when present.
  const [oreCounts,setOreCounts]=useState(()=>new Array(9).fill(0));
  // Hermit: peek at the rarity that *would* roll for the current hunt coin.
  // Computed via deterministic seed branch so it matches what onDigFound rolls.
  const [hermitPeek,setHermitPeek]=useState(null);
  const [pickerSlot,setPickerSlot]=useState(null);  // index of cabinet slot being filled, or null
  const marksCounterRef=useRef(null);  // for scrap flyer targeting
  // Per-dig scrap budget. Generated when entering dig phase. Some non-coin cells contain
  // scrap (chosen randomly per dig); each scrap-cell awards budget/scrapCellCount marks.
  // Remaining budget (unawarded if you found the coin early) is granted as bonus on success.
  const digBudgetRef=useRef({total:0,perCell:0,remaining:0,scrapCells:new Set()});
  const [ownedTarots,setOwnedTarots]=useState([]);   // array of card IDs
  const [equippedTarots,setEquippedTarots]=useState([]); // up to 5
  const [ownedFrames,setOwnedFrames]=useState([]);   // premium frames purchased
  const [ownedTitles,setOwnedTitles]=useState([]);   // premium titles purchased
  const [artefacts,setArtefacts]=useState([]);       // forged artefacts
  const [shrineView,setShrineView]=useState("forge");
  const [shrinePicker,setShrinePicker]=useState(null); // {metalIdx, available}: open coin picker for forging
  const [shrineSelection,setShrineSelection]=useState([]); // 5 coin IDs being forged
  const [schemaWarning,setSchemaWarning]=useState(null);
  const buff=useMemo(()=>tarotBuffs(equippedTarots),[equippedTarots]);
  const maxPins=6+(buff.pinSlots||0);
  const maxDur=shovelMaxDur(shovelLevel);
  const [tooDeepMsg,setTooDeepMsg]=useState(null);
  const [selectedCoin,setSelectedCoin]=useState(null);
  const [selectMode,setSelectMode]=useState(false);
  const [selectedIds,setSelectedIds]=useState(new Set());
  const [username,setUsername]=useState("");
  const [bio,setBio]=useState("Collector of ancient mintings from lost civilisations.");
  const [selectedTitle,setSelectedTitle]=useState(TITLES[0]);
  const [editingProfile,setEditingProfile]=useState(false);
  const level=lvl(xp);

  // Auto-revert frame if the player falls below requirement
  useEffect(()=>{if(level<FRAMES[frame].minLvl)setFrame("stone");},[level,frame]);
  // Keep selected title legal — accepts XP-unlocked titles AND any owned premium title.
  useEffect(()=>{
    const legal=unlockedTitles(level);
    const ownedPremiumLabels=ownedTitles.map(id=>PREMIUM_TITLE_BY_ID[id]?.label).filter(Boolean);
    if(!legal.includes(selectedTitle)&&!ownedPremiumLabels.includes(selectedTitle)){
      setSelectedTitle(legal.slice(-1)[0]||TITLES[0]);
    }
  },[level,selectedTitle,ownedTitles]);

  const [huntCoin,setHuntCoin]=useState(()=>mkCoin(newSeed(),1,null,1));
  const [coinFrac,setCoinFrac]=useState(()=>({x:.2+Math.random()*.6,y:.2+Math.random()*.6}));
  const [detFrac,setDetFrac]=useState({x:.5,y:.5});
  const [phase,setPhase]=useState("hunt");
  const [foundCoin,setFoundCoin]=useState(null);
  const fieldRef=useRef();
  const [showLucky,setShowLucky]=useState(false);

  const [gambMode,setGambMode]=useState("toss");
  const [tavernView,setTavernView]=useState("shop"); // shop · repair (duels hidden for now)
  // Same guard as the tab redirect — keeps hidden sub-views unreachable.
  useEffect(()=>{ if(tavernView==="duels")setTavernView("shop"); },[tavernView]);
  const [shopTab,setShopTab]=useState("tarot");      // tarot · banners · titles
  const [betIds,setBetIds]=useState([]);
  const [gambPhase,setGambPhase]=useState("select");
  const [gambResult,setGambResult]=useState(null);
  const [roulBetId,setRoulBetId]=useState(null);
  const [roulResult,setRoulResult]=useState(null);
  const [roulDone,setRoulDone]=useState(false);

  /* ── social state ───────────────────────────────────────────── */
  const [searchQ,setSearchQ]=useState("");
  const [searchResults,setSearchResults]=useState([]);
  const [searching,setSearching]=useState(false);
  const [friendsList,setFriendsList]=useState([]);
  const [followersList,setFollowersList]=useState([]);
  // Duels — pending+ready coin battles between this player and friends.
  // Refreshed when entering the Tavern · Duels tab and after any action.
  const [duelsList,setDuelsList]=useState([]);
  // When the player taps "Challenge" or "Accept", we open a coin picker modal
  // that filters their vault to legal stakes. duelStakeIntent describes what
  // the picker is for: {kind:"create",friendUsername} or {kind:"accept",duelId,opposingMetalIdx}
  const [duelStakeIntent,setDuelStakeIntent]=useState(null);
  // Result modal — shown after a flip resolves, displays the three flip coins
  // and the winner. {duelId, flips, winnerId, won:bool}
  const [duelResult,setDuelResult]=useState(null);
  const [viewingProfile,setViewingProfile]=useState(null); // username string or null
  const [profileData,setProfileData]=useState(null);
  const [profileLoading,setProfileLoading]=useState(false);
  const [profileErr,setProfileErr]=useState(null);

  const xpIn=xp-lvlMin(level);const xpRange=lvlMax(level)-lvlMin(level);

  /* ── auth bootstrap: on mount, if we have a token, fetch the vault ─ */
  useEffect(()=>{
    if(!token){setAuthReady(true);return;}
    let cancel=false;
    api.getVault().then(v=>{
      if(cancel)return;
      setPlayer({username:v.username});
      setUsername(v.username);
      setBio(v.bio||"");
      setXP(v.xp||0);
      setShovelLevel(v.shovelLevel||1);
      setBrushLevel(v.brushLevel||0);
      setFrame(v.frame||"stone");
      setSelectedTitle(v.selectedTitle||TITLES[0]);
      setPinnedIds(v.pinnedIds||null);
      setMarks(v.marks||0);
      setShovelDur(v.shovelDur!=null?v.shovelDur:shovelMaxDur(v.shovelLevel||1));
      setOwnedTarots(v.ownedTarots||[]);
      setEquippedTarots(v.equippedTarots||[]);
      setOwnedFrames(v.ownedFrames||[]);
      setOwnedTitles(v.ownedTitles||[]);
      setFindStreak(typeof v.findStreak==="number"?v.findStreak:0);
      setHangedManDate(typeof v.hangedManDate==="string"?v.hangedManDate:"");
      // ore_counts — resilient to missing migration. Server returns either
      // an array of 9 ints, or omits the field entirely if the column isn't
      // present yet. Default to zeros either way.
      setOreCounts(Array.isArray(v.oreCounts) && v.oreCounts.length===9
        ? v.oreCounts.map(n => Number(n)||0)
        : new Array(9).fill(0));
      setArtefacts(v.artefacts||[]);
      setSchemaWarning(v.schemaWarning||null);
      // reconstruct coins from stored {seed, metalIdx, shiny, locked, id, rarity?}
      setCoins((v.coins||[]).map(row=>{
        const base=mkCoin(row.seed,1,row.metalIdx);
        base.id=row.id;
        base.shiny=!!row.shiny;
        base.locked=!!row.locked;
        // Rarity: use stored value if present, otherwise the derived value from mkCoin stays
        if(typeof row.rarity==="number")base.rarity=row.rarity;
        return base;
      }));
      setLoadedFromServer(true);
      setAuthReady(true);
    }).catch(err=>{
      if(cancel)return;
      const msg=String(err.message||"");
      // ONLY treat actual auth failures (401) as a logout trigger.
      // Anything else (500, network, schema mismatch) keeps the token
      // and shows a retry screen — silently logging out destroys the session
      // for transient issues like a missing migration.
      if(/401|unauthor/i.test(msg)){
        try{localStorage.removeItem(TOKEN_KEY);}catch{}
        setToken(null);setAuthReady(true);setLoadErr(null);
      }else{
        // Keep token, show retry — likely a server-side issue
        setAuthReady(true);
        setLoadErr(msg||"Could not reach the vault");
      }
    });
    return()=>{cancel=true;};
  },[token,retryCounter]); // eslint-disable-line

  const handleAuthed=useCallback((tok,pl)=>{setToken(tok);setPlayer(pl);setUsername(pl.username);setLoadedFromServer(false);},[]);

  const handleLogout=useCallback(()=>{
    api.logout();
    try{localStorage.removeItem(TOKEN_KEY);}catch{}
    setToken(null);setPlayer(null);setCoins([]);setXP(0);setShovelLevel(1);setBrushLevel(0);
    setFrame("stone");setBio("");setSelectedTitle(TITLES[0]);setPinnedIds(null);
    setMarks(0);setShovelDur(40);setOwnedTarots([]);setEquippedTarots([]);
    setOwnedFrames([]);setOwnedTitles([]);setArtefacts([]);
    setDuelsList([]);setDuelStakeIntent(null);setDuelResult(null);
    setPhase("hunt");setFoundCoin(null);setTooDeepMsg(null);setTab("hunt");
    setLoadedFromServer(false);setAuthReady(true);
  },[api]);

  /* ── sync scalar state (debounced) ─────────────────────────────── */
  useDebouncedEffect(()=>{
    if(!loadedFromServer)return;
    api.tx({state:{xp,shovelLevel,brushLevel,frame,bio,selectedTitle,pinnedIds,marks,shovelDur,ownedTarots,equippedTarots,ownedFrames,ownedTitles,findStreak,hangedManDate,oreCounts}}).catch(()=>{});
  },[xp,shovelLevel,brushLevel,frame,bio,selectedTitle,pinnedIds,marks,shovelDur,ownedTarots,equippedTarots,ownedFrames,ownedTitles,findStreak,hangedManDate,oreCounts,loadedFromServer],800);

  /* ── load friends list on auth + when entering social tab ──── */
  useEffect(()=>{
    if(!token||!loadedFromServer)return;
    if(tab!=="social")return;
    api.listFriends().then(r=>{setFriendsList(r.friends||[]);setFollowersList(r.followers||[]);}).catch(()=>{});
  },[tab,token,loadedFromServer]); // eslint-disable-line

  /* ── duels: refresh when entering Tavern (any sub-tab) ───────────
     Cheap query and the count badge updates regardless of which sub-tab
     is selected, so the player can see "1 incoming duel" wherever they are. */
  const refreshDuels=useCallback(()=>{
    if(!token||!loadedFromServer)return;
    api.listDuels().then(r=>setDuelsList(r.duels||[])).catch(()=>{});
  },[api,token,loadedFromServer]);
  useEffect(()=>{
    if(tab!=="tavern")return;
    refreshDuels();
    // Poll every 30s while the Tavern is open so incoming duels and friend's
    // accepts/flips show up without requiring a tab switch.
    const id=setInterval(refreshDuels,30000);
    return()=>clearInterval(id);
  },[tab,refreshDuels]);

  /* ── debounced user search ──────────────────────────────────── */
  useDebouncedEffect(()=>{
    if(searchQ.trim().length<2){setSearchResults([]);setSearching(false);return;}
    setSearching(true);
    api.searchUsers(searchQ.trim()).then(r=>{setSearchResults(r.users||[]);setSearching(false);}).catch(()=>setSearching(false));
  },[searchQ],250);

  /* ── load specific profile ──────────────────────────────────── */
  useEffect(()=>{
    if(!viewingProfile)return;
    setProfileLoading(true);setProfileErr(null);setProfileData(null);
    api.getUser(viewingProfile).then(d=>{setProfileData(d);setProfileLoading(false);}).catch(e=>{setProfileErr(e.message);setProfileLoading(false);});
  },[viewingProfile]); // eslint-disable-line

  const handleAddFriend=useCallback(async(uname)=>{
    try{await api.addFriend(uname);
      // refresh both friend list and active profile
      api.listFriends().then(r=>{setFriendsList(r.friends||[]);setFollowersList(r.followers||[]);}).catch(()=>{});
      if(viewingProfile===uname)setProfileData(p=>p?{...p,isFriend:true}:p);
    }catch{}
  },[api,viewingProfile]);

  const handleRemoveFriend=useCallback(async(uname)=>{
    try{await api.removeFriend(uname);
      api.listFriends().then(r=>{setFriendsList(r.friends||[]);setFollowersList(r.followers||[]);}).catch(()=>{});
      if(viewingProfile===uname)setProfileData(p=>p?{...p,isFriend:false}:p);
    }catch{}
  },[api,viewingProfile]);

  /* ── duel actions ────────────────────────────────────────────── */
  // Open the stake-picker modal for creating a new duel against a friend.
  const promptCreateDuel=useCallback((friendUsername)=>{
    setDuelStakeIntent({kind:"create",friendUsername});
  },[]);
  // Open the stake-picker modal for accepting an incoming duel.
  // The opposingMetalIdx is passed so we can filter the player's coin list to
  // only those within the legal tier gap.
  const promptAcceptDuel=useCallback((duel)=>{
    if(!duel?.challengerCoin)return;
    setDuelStakeIntent({kind:"accept",duelId:duel.id,opposingMetalIdx:duel.challengerCoin.metalIdx});
  },[]);
  // Submit a stake from the picker — runs create or accept depending on intent.
  const submitStake=useCallback(async(coinId)=>{
    if(!duelStakeIntent)return;
    try{
      if(duelStakeIntent.kind==="create"){
        await api.createDuel(duelStakeIntent.friendUsername,coinId);
      }else if(duelStakeIntent.kind==="accept"){
        await api.acceptDuel(duelStakeIntent.duelId,coinId);
      }
      setDuelStakeIntent(null);
      refreshDuels();
    }catch(e){
      // Show server error message inline to the picker so the player knows why
      // — typical cases: tier gap, locked coin, friend's coin gone stale.
      setDuelStakeIntent(prev=>prev?{...prev,error:e.message||"Could not stake coin"}:prev);
    }
  },[api,duelStakeIntent,refreshDuels]);
  const declineDuel=useCallback(async(duelId)=>{
    try{await api.declineDuel(duelId);refreshDuels();}catch{}
  },[api,refreshDuels]);
  // Flip — runs the duel resolution server-side and shows the result modal.
  // After the modal closes, we refresh the vault (because coins changed hands)
  // and the duels list.
  const flipDuel=useCallback(async(duel)=>{
    try{
      const r=await api.flipDuel(duel.id);
      if(!r?.ok)return;
      const won=r.winnerUsername===player?.username;
      setDuelResult({duelId:duel.id,flips:r.flips,winnerUsername:r.winnerUsername,won,duel});
      // Refresh in the background so when the modal closes data is fresh
      api.getVault().then(v=>{
        if(Array.isArray(v.coins)){
          setCoins(v.coins.map(row=>{
            const base=mkCoin(row.seed,1,row.metalIdx);
            base.id=row.id;base.shiny=!!row.shiny;base.locked=!!row.locked;
            if(typeof row.rarity==="number")base.rarity=row.rarity;
            return base;
          }));
        }
      }).catch(()=>{});
      refreshDuels();
    }catch{}
  },[api,player,refreshDuels]);

  const xpPct=Math.min(100,Math.round(xpIn/xpRange*100));
  const fr=FRAMES[frame];
  const brushData=BRUSH_UPS[brushLevel];
  const autoTop=useMemo(()=>[...coins].sort((a,b)=>{
    const ra=coinRarity(a),rb=coinRarity(b);
    if(ra!==rb)return rb-ra;                          // rarity first
    if(b.metalIdx!==a.metalIdx)return b.metalIdx-a.metalIdx; // then metal tier
    return (b.shiny?1:0)-(a.shiny?1:0);              // then shiny
  }).slice(0,maxPins),[coins,maxPins]);
  // Pinned showcase preserves the order in pinnedIds (slot 0 = first ID in array).
  // Previously used coins.filter which broke ordering since it followed coin acquisition order.
  const showcaseCoins=useMemo(()=>{
    if(!pinnedIds)return autoTop;
    const byId=new Map(coins.map(c=>[c.id,c]));
    // Preserve null slots (empty positions) — only filter null at the end of the array
    const arr=pinnedIds.slice(0,maxPins).map(id=>id?byId.get(id)||null:null);
    return arr;
  },[pinnedIds,coins,autoTop,maxPins]);

  const dist=Math.hypot(detFrac.x-coinFrac.x,detFrac.y-coinFrac.y);
  const signal=Math.max(0,1-dist/.55);const canDig=dist<.09;
  const signalColor=signal>.75?"#50e890":signal>.4?"#f0c850":"#7088a8";

  const onFieldInteract=useCallback((e)=>{
    if(!fieldRef.current||phase!=="hunt")return;
    e.preventDefault();
    const rect=fieldRef.current.getBoundingClientRect();
    const cx2=e.touches?e.touches[0].clientX:e.clientX;
    const cy2=e.touches?e.touches[0].clientY:e.clientY;
    const x=Math.max(0,Math.min(1,(cx2-rect.left)/rect.width));
    const y=Math.max(0,Math.min(1,(cy2-rect.top)/rect.height));
    setDetFrac({x,y});
  },[phase]);

  const onDig=()=>{
    if(!canDig||phase!=="hunt")return;
    if(shovelDur<=0){setTooDeepMsg("Pickaxe broken — repair it in the Shop.");return;}
    // ─ Per-cell scrap budget infrastructure (kept for visual feedback only) ─
    // Marks income from digging was removed in the economy rebalance — now there's
    // no payout per cell. The budget structure stays so the scrap-cells set still
    // exists for the on-cell-dug effect (currently a no-op visually since the
    // flyer was removed too). Future feature can re-use this hook.
    const r=new RNG(huntCoin.seed^0x5c4ab);
    const coinCellIdx=new RNG(huntCoin.seed^0xd16).int(0,GRID*GRID-1);
    const scrapCells=new Set();
    const scrapCellCount=r.int(3,5);
    while(scrapCells.size<scrapCellCount){
      const idx=r.int(0,GRID*GRID-1);
      if(idx!==coinCellIdx)scrapCells.add(idx);
    }
    digBudgetRef.current={total:0,perCell:0,remaining:0,scrapCells};
    setFoundCoin(huntCoin);setTooDeepMsg(null);setPhase("dig");
  };

  // Enter / Space to dig — desktop convenience so you don't need to click off the field
  useEffect(()=>{
    if(tab!=="hunt"||phase!=="hunt"||!canDig)return;
    const h=(e)=>{
      // Skip if typing in a form field
      if(e.target?.tagName==="INPUT"||e.target?.tagName==="TEXTAREA"||e.target?.tagName==="SELECT")return;
      if(e.key==="Enter"||e.key===" "){e.preventDefault();onDig();}
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[tab,phase,canDig,shovelDur]); // eslint-disable-line

  // ── ORE SYSTEM ────────────────────────────────────────────────────
  // addOre: invoked by HuntSideScroller every time a skeleton drops an ore.
  // metalIdx 0..8 maps to METALS array. Cap at ORE_PER_BAR (10) so further
  // drops while a bar is full are simply discarded (player must claim).
  const addOre = useCallback((metalIdx, n = 1) => {
    setOreCounts(prev => {
      const next = prev.slice();
      next[metalIdx] = Math.min(10, (next[metalIdx] || 0) + n);
      return next;
    });
    // Kill XP scales linearly with player level.
    // Tweak the multiplier here to rebalance — currently 12 * level per kill.
    const killXP = 12 * Math.max(1, level);
    setXP(p => p + Math.round(killXP * (1 + (buff.xpMul || 0))));
  }, [level, buff.xpMul]);

  // claimOreCoin: called when the player taps a full ore bar in OreBars.
  // Resets that metal's ore counter to 0, generates a new coin of that
  // metal using the existing coin-gen system (rarity, shape, emblem all
  // rolled), then transitions to the brush phase. The brush flow takes
  // over from there — shiny still rolls during brushing as usual.
  const claimOreCoin = useCallback((metalIdx) => {
    if ((oreCounts[metalIdx] || 0) < 10) return; // safety
    // Drain the bar
    setOreCounts(prev => {
      const next = prev.slice();
      next[metalIdx] = 0;
      return next;
    });
    // Generate a coin OF EXACTLY this metal at the player's level.
    // mkCoin signature: mkCoin(seed, pLvl, tier, tierCap, rarityOverride)
    // — `tier` is the fixed metalIdx (when non-null). Passing it as the
    // 4th positional param made it a CAP (so silver claim could roll
    // copper/bronze/silver instead of locking to silver).
    const coin = mkCoin(newSeed(), level, metalIdx);
    // Hand off to brush phase. Brush expects foundCoin to be set.
    setFoundCoin(coin);
    setPhase("brush");
  }, [oreCounts, level]);

  const onDigFound=(cnt,total)=>{
    // ─ COHERENT RARITY MODEL ─
    // Dig timing now affects RARITY, not metal. Metal is what the ground gave you;
    // rarity is what you earned by finding it efficiently.
    //   cnt 1 (first try):           "first"  → +2 rarity tiers, fanfare
    //   cnt 2:                       "lucky"  → +1 rarity tier
    //   cnt 3 with Chariot:          "lucky"  → +1 rarity tier (Chariot only)
    //   cnt 4-15:                    no rarity mod
    //   cnt 16 (all cells):          "damaged" → -1 rarity tier (still keeps coin)
    // Emperor tarot adds an independent +1 rarity roll.
    // Shiny adds +1 rarity tier on top (rolled in brush phase).
    let reason=null;
    if(cnt===1)reason="first";
    else if(cnt===2)reason="lucky";
    else if(cnt>=total)reason="damaged";

    // Roll rarity now (shiny gets folded in at brush phase). Player level + dig
    // condition are the inputs.
    const rRng=new RNG(foundCoin.seed^0xfa11);
    let rarity=rollRarity(rRng,level,reason,false);
    // The Sun: rarity floor — all finds at least Uncommon (or whatever the card sets).
    // Applied before the Wheel guarantee so they stack constructively.
    if(buff.rarityFloor>0&&rarity<buff.rarityFloor){
      rarity=buff.rarityFloor;
    }
    // Wheel of Fortune: every Nth find (default N=7) is guaranteed at least Rare.
    // findStreak counts consecutive finds since last guaranteed trigger.
    const newStreak=findStreak+1;
    let streakReset=false;
    if(buff.guaranteedEvery>0&&newStreak>=buff.guaranteedEvery){
      const floor=buff.guaranteedFloor||2; // Rare = index 2
      if(rarity<floor){rarity=floor;}
      streakReset=true;
    }
    setFindStreak(streakReset?0:newStreak);
    if(rarity>=4)reason="first"; // Legendary or Mythic always feels like a first-try moment

    // Skill bonus only — small marks reward for fast digs. No more
    // "remaining budget" payout. Income now flows almost entirely through
    // selling/forging coins, not through the dig itself.
    const skillBonus=cnt===1?20:cnt<=3?8:0;

    const showFanfare=rarity>=4||reason==="first";
    setFoundCoin(p=>p?{...p,rarity,digBonus:reason,digCnt:cnt,scrapEarned:skillBonus}:p);
    if(showFanfare)setShowLucky(true);

    if(skillBonus>0)setMarks(m=>m+skillBonus);
    if(digBudgetRef.current)digBudgetRef.current.remaining=0;
    // Pickaxe wear: 1 base, plus integer extra from durPenalty (Magician adds 1).
    // Old durMul-as-probability removed in tarot rework.
    const wearAmount=1+Math.round(buff.durPenalty||0);
    setShovelDur(d=>Math.max(0,d-wearAmount));
    // XP scales with rarity now too — finding a Legendary feels meaningfully better
    const xpBase=80+(cnt===1?40:cnt<=3?15:0);
    const xpRarityBonus=rarity*30; // 0/30/60/90/120/150 by rarity
    const xpGain=Math.round((xpBase+xpRarityBonus)*(1+buff.xpMul));
    setXP(p=>p+xpGain);
    setPhase("brush");
  };
  // Per-cell scrap callback fired by DigPit when a non-coin cell is excavated.
  // Only awards if this cell was in the pre-budgeted scrap set generated at onDig.
  // Each scrap-cell awards budget.perCell marks, with the running total drained
  // from budget.remaining so the bonus payout at the end shrinks accordingly.
  const [scrapFlyers,setScrapFlyers]=useState([]);
  const onCellScrap=useCallback((cellIdx,rect)=>{
    // Per-cell scrap marks were removed in the economy rebalance — hunting now
    // rewards via coin sales, not via scrap during dig. The visual flyer is
    // kept for tactile feedback (you uncovered a piece of coin matter), just
    // without awarding marks. The "remaining" budget is still tracked because
    // it gets consumed-then-returned as a bonus payout in onDigFound.
    const budget=digBudgetRef.current;
    if(!budget?.scrapCells?.has?.(cellIdx))return;
    // Subtract from the remaining budget so the dig completion bonus reflects
    // that you "found" some of the budget cell-by-cell — but no marks change.
    budget.remaining=Math.max(0,budget.remaining-budget.perCell);
  },[]);
  const onTooDeep=(d)=>setTooDeepMsg(`Coin lies at depth ${d} — upgrade your shovel.`);
  // Abandon the current dig — prevents soft-lock when a too-deep coin is
  // unreachable AND the player can't afford to forge. Generates a new hunt
  // coin and returns to the hunt phase. No reward, no penalty.
  const onAbandon=()=>{
    // Small consolation so abandoning isn't a dead loss — soft-lock prevention.
    const consolation=Math.max(1,Math.round(4+shovelLevel*0.5));
    setMarks(m=>m+consolation);
    const tc=SHOVEL_TIER_CAP[Math.min(shovelLevel-1,SHOVEL_TIER_CAP.length-1)];
    const next=mkCoin(newSeed(),level,null,tc);
    setHuntCoin(next);setCoinFrac({x:.1+Math.random()*.8,y:.1+Math.random()*.8});
    setDetFrac({x:.5,y:.5});setFoundCoin(null);setTooDeepMsg(null);setPhase("hunt");
  };
  // Hermit's wisdom — skip the current hunt (regenerate coin) without penalty.
  // Triggered from the hunt screen when Hermit is equipped and the revealed
  // rarity isn't worth the trouble. Doesn't consume pickaxe durability or marks.
  const onSkipHunt=()=>{
    if(phase!=="hunt")return;
    const tc=SHOVEL_TIER_CAP[Math.min(shovelLevel-1,SHOVEL_TIER_CAP.length-1)];
    const next=mkCoin(newSeed(),level,null,tc);
    setHuntCoin(next);
    setCoinFrac({x:.1+Math.random()*.8,y:.1+Math.random()*.8});
    setDetFrac({x:.5,y:.5});
  };
  // Hanged Man tarot: once per day, reroll the rarity of a coin you just found.
  // Used during the brush phase — the player gets to gamble for a better outcome.
  // Date-keyed to player's local date string so it resets at midnight in their TZ.
  const todayDate=()=>new Date().toDateString();
  const hangedManAvailable=buff.rerollRarity>0&&hangedManDate!==todayDate();
  const rerollFoundRarity=()=>{
    if(!hangedManAvailable||!foundCoin)return;
    setHangedManDate(todayDate());
    // New rarity roll, fresh RNG, weighted by player level. Doesn't carry digBonus reason
    // so the player gets a "fair" base roll — the gamble is whether RNG smiles.
    const newRarity=rollRarity(new RNG(((Date.now()^0x4ace)>>>0)),level,null,false);
    setFoundCoin(p=>p?{...p,rarity:newRarity,rerolled:true}:p);
  };
  const onBrushDone=(isShiny)=>{
    setFoundCoin(p=>{
      if(!p)return p;
      // Shiny adds +1 rarity tier on top of whatever was rolled at find time
      const newRarity=isShiny?Math.min(MAX_RARITY,(p.rarity??0)+1):p.rarity;
      return{...p,shiny:!!isShiny,rarity:newRarity};
    });
    setPhase("banner");
  };
  const onBannerDone=()=>{
    if(foundCoin){
      const stored={...foundCoin};
      setCoins(p=>[stored,...p]);
      // Grant marks: 30% of the coin's display value, modulated by Empress/Wheel of Fortune
      const earned=Math.max(1,Math.round(coinValue(stored)*0.3*(1+buff.marksMul)));
      setMarks(m=>m+earned);
      // Persist: add the coin (server maps {id,seed,metalIdx,shiny})
      api.tx({add:[{id:stored.id,seed:stored.seed,metalIdx:stored.metalIdx,shiny:!!stored.shiny,rarity:stored.rarity}]}).catch(()=>{});
    }
    const tc=SHOVEL_TIER_CAP[Math.min(shovelLevel-1,SHOVEL_TIER_CAP.length-1)];
    const next=mkCoin(newSeed(),level,null,tc);
    setHuntCoin(next);setCoinFrac({x:.1+Math.random()*.8,y:.1+Math.random()*.8});
    setDetFrac({x:.5,y:.5});setFoundCoin(null);setPhase("hunt");
    setHangedManUsed(false); // fresh reroll budget for next hunt
  };

  // Pin toggle — when going from auto-mode (pinnedIds === null) to manual,
  // start with JUST the tapped coin instead of inheriting all 6 auto-top coins,
  // otherwise the slots are immediately full and you can't add anything new.
  // To unpin in auto-mode, the user can manually start their own selection from scratch.
  const togglePin=(id)=>setPinnedIds(prev=>{
    if(prev==null){
      return [id];
    }
    if(prev.includes(id))return prev.filter(x=>x!==id);
    if(prev.length<maxPins)return [...prev,id];
    return prev;
  });
  // Add a coin to the cabinet, unconditionally if there's room. Used by the
  // picker modal opened from an empty slot — the bug was that the only way to
  // pin was double-tap-vault, which was unreliable on mobile.
  const pinCoinToSlot=(id)=>{
    setPinnedIds(prev=>{
      // Snapshot current pins (transitioning auto→manual takes the auto list as base)
      const base=prev??autoTop.map(c=>c.id);
      if(base.includes(id))return base; // already pinned
      if(base.length>=maxPins)return base;
      return [...base,id];
    });
    setPickerSlot(null);
  };
  // Place a coin in a specific cabinet slot. Used by the slot-tap-to-pick flow:
  // tapping an empty slot opens a picker, then the picker calls this with (slotIdx, coinId).
  // If we were in auto mode, transitions to manual mode seeded with current showcase.
  const pinToSlot=(slotIdx,coinId)=>{
    setPinnedIds(prev=>{
      // Start from current visible showcase if we were in auto mode
      let next=prev==null?showcaseCoins.map(c=>c?.id||null):[...prev];
      // If the coin was already pinned elsewhere, null out that previous slot
      const existingIdx=next.indexOf(coinId);
      if(existingIdx>=0)next[existingIdx]=null;
      // Pad with nulls up to target slot
      while(next.length<=slotIdx)next.push(null);
      next[slotIdx]=coinId;
      // Trim trailing nulls but PRESERVE interior nulls (they're empty slots)
      while(next.length&&next[next.length-1]==null)next.pop();
      // Clamp length
      if(next.length>maxPins)next=next.slice(0,maxPins);
      return next;
    });
    setPickerSlot(null);
  };
  const clearPinSlot=(slotIdx)=>{
    setPinnedIds(prev=>{
      const next=prev==null?showcaseCoins.map(c=>c?.id||null):[...prev];
      if(slotIdx<next.length)next[slotIdx]=null;
      // Trim trailing nulls only
      while(next.length&&next[next.length-1]==null)next.pop();
      return next;
    });
  };

  // Sell a coin from the vault for marks (locked coins protected)
  const sellCoin=useCallback((id)=>{
    const c=coins.find(x=>x.id===id);if(!c||c.locked)return;
    const earned=Math.round(coinValue(c)*(1+buff.marksMul));
    setCoins(prev=>prev.filter(x=>x.id!==id));
    setMarks(m=>m+earned);
    // Also remove from pinned showcase to avoid phantom slots
    setPinnedIds(prev=>prev?prev.filter(x=>x!==id):prev);
    setSelectedCoin(null);
    api.tx({remove:[id]}).catch(()=>{});
  },[coins,buff.marksMul,api]);

  // Bulk sell — sell every selected coin at once (skips locked).
  const bulkSell=useCallback(()=>{
    const ids=[...selectedIds];
    const sellable=coins.filter(c=>ids.includes(c.id)&&!c.locked);
    if(!sellable.length)return;
    const total=sellable.reduce((s,c)=>s+Math.round(coinValue(c)*(1+buff.marksMul)),0);
    const sellableIds=sellable.map(c=>c.id);
    setCoins(prev=>prev.filter(c=>!sellableIds.includes(c.id)));
    setMarks(m=>m+total);
    setPinnedIds(prev=>prev?prev.map(x=>sellableIds.includes(x)?null:x):prev);
    setSelectedIds(new Set());
    setSelectMode(false);
    api.tx({remove:sellableIds}).catch(()=>{});
  },[selectedIds,coins,buff.marksMul,api]);
  // Total value of selected coins (display in action bar)
  const selectedTotal=useMemo(()=>{
    let total=0,locked=0;
    for(const id of selectedIds){
      const c=coins.find(x=>x.id===id);if(!c)continue;
      if(c.locked){locked++;continue;}
      total+=Math.round(coinValue(c)*(1+buff.marksMul));
    }
    return{total,locked,sellable:selectedIds.size-locked};
  },[selectedIds,coins,buff.marksMul]);

  // Repair pickaxe — pay marks per missing durability
  const repairPickaxe=()=>{
    const missing=maxDur-shovelDur;
    if(missing<=0)return;
    const cost=repairCost(missing,shovelLevel);
    if(marks<cost)return;
    setMarks(m=>m-cost);
    setShovelDur(maxDur);
  };

  // When pickaxe is broken AND can't afford a repair, the shop sells a fresh Lv1
  // pickaxe at proportional cost. Resets shovel level to 1 — a true last-resort
  // soft-lock break. Always available so a player can always escape the deadlock.
  const NEW_PICKAXE_COST=200;
  const buyNewPickaxe=()=>{
    if(marks<NEW_PICKAXE_COST)return;
    if(shovelDur>0)return; // only when broken
    setMarks(m=>m-NEW_PICKAXE_COST);
    setShovelLevel(1);
    setShovelDur(shovelMaxDur(1));
  };

  // Buy a tarot card from the shop
  const buyTarot=(cardId)=>{
    const card=TAROT_BY_ID[cardId];if(!card)return;
    if(marks<card.price)return;
    if(ownedTarots.includes(cardId))return; // single copy of each
    setMarks(m=>m-card.price);
    setOwnedTarots(prev=>[...prev,cardId]);
    // Persist the purchase + new marks balance atomically
    api.tx({tarotBuy:[cardId],state:{marks:marks-card.price}}).catch(()=>{});
  };
  // Buy a premium frame (banner). XP-gated and marks-priced.
  const buyFrame=(frameId)=>{
    const f=FRAMES[frameId];if(!f||!f.premium)return;
    if(level<f.minLvl||marks<f.price||ownedFrames.includes(frameId))return;
    setMarks(m=>m-f.price);
    setOwnedFrames(prev=>[...prev,frameId]);
  };
  // Buy a premium title. XP-gated and marks-priced.
  const buyTitle=(titleId)=>{
    const ti=PREMIUM_TITLE_BY_ID[titleId];if(!ti)return;
    if(level<ti.minLvl||marks<ti.price||ownedTitles.includes(titleId))return;
    setMarks(m=>m-ti.price);
    setOwnedTitles(prev=>[...prev,titleId]);
  };

  // Forge an artefact at the Shrine.
  // Takes 5 coin IDs of the same metal. Consumes them + a marks fee.
  // Output grade is determined by the average rarity of inputs.
  const forgeArtefact=(coinIds)=>{
    if(coinIds.length!==5)return{ok:false,error:"Need exactly 5 coins"};
    const inputs=coinIds.map(id=>coins.find(c=>c.id===id)).filter(Boolean);
    if(inputs.length!==5)return{ok:false,error:"Some coins missing"};
    if(inputs.some(c=>c.locked))return{ok:false,error:"Cannot use locked coins"};
    const metal=inputs[0].metalIdx;
    if(!inputs.every(c=>c.metalIdx===metal))return{ok:false,error:"All 5 must be the same metal"};
    const baseCost=ARTEFACT_FORGE_COST[metal]||80;
    // Tower tarot reduces forge cost by 30% if equipped
    const cost=Math.max(1,Math.round(baseCost*(1-(buff.forgeDiscount||0))));
    if(marks<cost)return{ok:false,error:`Need ◈${cost.toLocaleString()}`};
    // Average rarity → grade
    const avgRarity=inputs.reduce((s,c)=>s+coinRarity(c),0)/5;
    const grade=gradeForRaritySum(avgRarity);
    const def=ARTEFACTS[metal];
    const newArtefact={
      id:`a_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      metal,
      grade,
      forgedAt:Date.now(),
    };
    // Apply state changes
    setMarks(m=>m-cost);
    setCoins(prev=>prev.filter(c=>!coinIds.includes(c.id)));
    setPinnedIds(prev=>prev?prev.map(x=>coinIds.includes(x)?null:x):prev);
    setArtefacts(prev=>[newArtefact,...prev]);
    api.tx({remove:coinIds,artefactAdd:[newArtefact]}).catch(()=>{});
    return{ok:true,artefact:newArtefact,def,gradeName:ARTEFACT_GRADES[grade].name};
  };

  // Equip / unequip tarot (max MAX_EQUIPPED_TAROTS active slots — currently 2)
  const toggleTarot=(cardId)=>{
    setEquippedTarots(prev=>{
      if(prev.includes(cardId))return prev.filter(x=>x!==cardId);
      if(prev.length>=MAX_EQUIPPED_TAROTS)return prev; // full
      return [...prev,cardId];
    });
  };

  // Lock toggle — prevents a coin being used in upgrades/wagers
  const toggleLock=useCallback((id)=>{
    setCoins(prev=>{
      const next=prev.map(c=>c.id===id?{...c,locked:!c.locked}:c);
      const target=next.find(c=>c.id===id);
      if(target)api.tx({lock:[{id,locked:target.locked}]}).catch(()=>{});
      return next;
    });
  },[api]);

  // Available coins for sacrificing/betting = unlocked only
  const sacrificialCoins=useMemo(()=>coins.filter(c=>!c.locked),[coins]);
  const canAfford=(cost)=>!cost||cost.every(({m,n})=>sacrificialCoins.filter(c=>c.metalIdx===m).length>=n);
  const forgeUp=(type)=>{
    const isS=type==="shovel";const nl=isS?shovelLevel+1:brushLevel+1;
    const u=(isS?SHOVEL_UPS:BRUSH_UPS)[nl];if(!u||!canAfford(u.cost))return;
    const removedIds=[];
    let rem=[...coins];
    if(u.cost){
      for(const{m,n}of u.cost){
        let r=0;
        rem=rem.filter(c=>{
          if(!c.locked&&c.metalIdx===m&&r<n){
            r++;
            // Justice: 25% chance to recover the consumed material
            if(Math.random()<buff.forgeRefund){return true;}
            removedIds.push(c.id);
            return false;
          }
          return true;
        });
      }
    }
    setCoins(rem);
    if(isS){setShovelLevel(nl);setShovelDur(shovelMaxDur(nl));} // refill on upgrade
    else setBrushLevel(nl);
    setXP(p=>p+200);
    if(removedIds.length)api.tx({remove:removedIds}).catch(()=>{});
  };

  const gamble=GAMBLES.find(g=>g.id===gambMode)||GAMBLES[0];
  const betCoins=betIds.map(id=>coins.find(c=>c.id===id)).filter(Boolean);
  const gambOk=betCoins.length===gamble.count&&(!gamble.same||new Set(betCoins.map(c=>c.metalIdx)).size===1);
  const doGamble=()=>{if(!gambOk||gambPhase!=="select")return;setGambPhase("spinning");setTimeout(()=>{const res=gamble.resolve(betCoins);setCoins(prev=>[...res.add,...prev.filter(c=>!res.remove.includes(c.id))]);setXP(p=>p+(res.won?120:20));setGambResult(res);setGambPhase("result");
    api.tx({remove:res.remove,add:res.add.map(c=>({id:c.id,seed:c.seed,metalIdx:c.metalIdx,shiny:!!c.shiny}))}).catch(()=>{});
  },1600);};
  const resetGamble=()=>{setBetIds([]);setGambResult(null);setGambPhase("select");};
  const toggleBet=(id)=>{if(gambPhase!=="select")return;
    const c=coins.find(x=>x.id===id);if(c?.locked)return;  // ignore taps on locked coins
    setBetIds(prev=>{if(prev.includes(id))return prev.filter(x=>x!==id);if(prev.length>=gamble.count)return[...prev.slice(1),id];return[...prev,id];});};
  const roulBetCoin=coins.find(c=>c.id===roulBetId)||null;
  const onRoulResult=(sector)=>{
    if(!roulBetCoin)return;const tier=roulBetCoin.metalIdx;let remove=[roulBetCoin.id],add=[],msg="",won=false;
    if(sector.outcome==="lose"){msg="BETTER LUCK NEXT TIME";}
    else if(sector.outcome==="same"){add=[mkCoin(newSeed(),1,tier)];won=true;msg="SAME TIER RETURNED";}
    else if(sector.outcome==="up1"){add=[mkCoin(newSeed(),1,Math.min(MAX_TIER,tier+1))];won=true;msg="TIER UP";}
    else if(sector.outcome==="x2"){add=[mkCoin(newSeed(),1,tier),mkCoin(newSeed(),1,tier)];won=true;msg="DOUBLE RETURN";}
    else if(sector.outcome==="up2"){add=[mkCoin(newSeed(),1,Math.min(MAX_TIER,tier+2))];won=true;msg="DOUBLE TIER UP";}
    else if(sector.outcome==="jackpot"){add=[mkCoin(newSeed(),1,MAX_TIER)];won=true;msg="JACKPOT — VOID COIN";}
    setCoins(prev=>[...add,...prev.filter(c=>!remove.includes(c.id))]);setXP(p=>p+(won?140:20));
    // Stash the original bet coin in the result. Once we remove it from
    // `coins` above, roulBetCoin (derived from coins.find) goes null —
    // which previously made the entire result block disappear because the
    // Tavern UI was conditioned on roulBetCoin. The result now carries
    // its own snapshot of the coin so the post-spin UI stays visible.
    setRoulResult({won,add,msg,betCoin:roulBetCoin,sector});setRoulDone(true);
    api.tx({remove,add:add.map(c=>({id:c.id,seed:c.seed,metalIdx:c.metalIdx,shiny:!!c.shiny}))}).catch(()=>{});
  };
  const resetRoulette=()=>{setRoulBetId(null);setRoulResult(null);setRoulDone(false);};
  const visCoins=filter===-1?coins:coins.filter(c=>c.metalIdx===filter);

  /* shared style helpers */
  const F={fontFamily:"Outfit,sans-serif"};
  const VT={fontFamily:"VT323,monospace"};
  const FR={fontFamily:"'Fraunces',serif"};
  const card={background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,boxShadow:isDark?"0 1px 0 rgba(255,255,255,.02) inset, 0 6px 16px rgba(0,0,0,.18)":"0 1px 0 rgba(255,255,255,.6) inset, 0 4px 12px rgba(74,40,8,.06)"};
  const mu={...F,fontSize:13,color:t.muted,fontWeight:500};
  const microLabel={...F,fontSize:10,color:t.muted,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase"};
  const sectionTitle={...FR,fontWeight:700,fontSize:22,letterSpacing:-.3,color:t.text};

  /* ── auth gate ──────────────────────────────────────────────── */
  if(!authReady){
    return(<div style={{...F,minHeight:"100vh",background:DARK.bg,color:DARK.muted,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Outfit,sans-serif",fontSize:13,letterSpacing:2,textTransform:"uppercase"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontFamily:"'Fraunces',serif",fontSize:22,color:DARK.accent}}>⚒</span> Opening the vault…</div>
    </div>);
  }
  // If we have a token but vault load failed (non-auth error like a server bug),
  // show a retry screen instead of bouncing back to login. Logging the user out
  // for a transient server issue is far more frustrating than this explicit retry.
  if(token&&loadErr&&!loadedFromServer){
    return(
      <div style={{...F,minHeight:"100vh",background:DARK.bg,color:DARK.text,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 20px",position:"relative"}}>
        <div className="noise-overlay" style={{position:"fixed",zIndex:1,opacity:.04}}/>
        <div style={{position:"relative",zIndex:2,maxWidth:380,textAlign:"center"}}>
          <div style={{fontSize:48,opacity:.5,marginBottom:16}}>⚒</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:800,fontSize:22,letterSpacing:-.4,marginBottom:10}}>The vault won't open</div>
          <div style={{fontSize:13,color:DARK.textDim,lineHeight:1.55,marginBottom:6}}>The server returned an error while loading your account. This is most likely a backend issue — your account is safe.</div>
          <div style={{fontFamily:"VT323,monospace",fontSize:13,color:DARK.danger,padding:"10px 14px",background:"rgba(210,74,40,.08)",border:`1px solid ${DARK.danger}33`,borderRadius:8,margin:"16px 0",letterSpacing:.5,wordBreak:"break-word"}}>{loadErr}</div>
          <div style={{display:"flex",flexDirection:"column",gap:9,marginTop:18}}>
            <button onClick={()=>{setLoadErr(null);setRetryCounter(c=>c+1);}} style={{padding:"12px 0",borderRadius:11,border:`1px solid ${DARK.accent}`,background:`linear-gradient(135deg,${DARK.accentHi},${DARK.accent})`,cursor:"pointer",fontWeight:800,fontSize:13,color:DARK.accentInk,letterSpacing:2.5,textTransform:"uppercase",fontFamily:"Outfit,sans-serif"}}>Retry</button>
            <button onClick={()=>{try{localStorage.removeItem(TOKEN_KEY);}catch{}setToken(null);setLoadErr(null);}} style={{padding:"10px 0",borderRadius:11,border:`1px solid ${DARK.border}`,background:"transparent",cursor:"pointer",fontWeight:600,fontSize:11,color:DARK.muted,letterSpacing:2,textTransform:"uppercase",fontFamily:"Outfit,sans-serif"}}>Sign out</button>
          </div>
        </div>
      </div>
    );
  }
  if(!token){return<AuthScreen onAuthed={handleAuthed}/>;}

  /* ── GAME CONTEXT VALUE ───────────────────────────────────────
   * Bundles everything screens need into a single object passed via
   * GameContext. Screens read what they need with destructure:
   *   const { coins, marks, sellCoin, t } = useGame();
   *
   * This is one big object on purpose. Splitting context per concern
   * (e.g. ProfileContext, HuntContext) is a premature optimisation at
   * this size — only the active screen renders at any given time, so
   * the "big context = re-render storm" critique doesn't apply here. */
  const g = {
    // Theme
    t, isDark, setIsDark,
    F, VT, FR, mu, microLabel, sectionTitle, card,
    // Auth + API
    // `player` is the local state var (line 79); aliased to `currentPlayer`
    // for the context export so existing consumers — and any future code
    // that grabs it from useGame() — can read either name. setPlayer + 
    // setToken are exposed so the AuthScreen / sign-out button can mutate.
    token, setToken, player, currentPlayer: player, setPlayer, api,
    schemaWarning, setSchemaWarning,
    // Coins + currency
    coins, setCoins,
    marks, setMarks,
    xp, setXP,
    artefacts, setArtefacts,
    // Equipment
    shovelLevel, setShovelLevel,
    brushLevel, setBrushLevel,
    shovelDur, setShovelDur,
    maxDur, brushData,
    // Profile + cosmetics
    username, bio, setBio,
    frame, setFrame, fr,
    selectedTitle, setSelectedTitle,
    pinnedIds, setPinnedIds, maxPins,
    ownedFrames, setOwnedFrames,
    ownedTitles, setOwnedTitles,
    ownedTarots, setOwnedTarots,
    equippedTarots, setEquippedTarots,
    pickerSlot, setPickerSlot,
    // Routing
    tab, setTab,
    tavernView, setTavernView,
    shopTab, setShopTab,
    shrineView, setShrineView,
    // Vault filtering / selection
    filter, setFilter,
    selectMode, setSelectMode,
    selectedIds, setSelectedIds,
    selectedTotal,
    selectedCoin, setSelectedCoin,
    visCoins, autoTop, showcaseCoins,
    // Hunt loop
    huntCoin, setHuntCoin,
    coinFrac, setCoinFrac, detFrac, setDetFrac,
    phase, setPhase,
    foundCoin, setFoundCoin,
    showLucky, setShowLucky,
    findStreak, setFindStreak,
    hermitPeek, setHermitPeek,
    tooDeepMsg, setTooDeepMsg,
    signal, signalColor, canDig, dist,
    fieldRef,
    onFieldInteract, onDig, onDigFound, onCellScrap, onTooDeep,
    onAbandon, onSkipHunt, onBrushDone, onBannerDone,
    rerollFoundRarity, hangedManAvailable, todayDate,
    // Ore counters (skeleton drops feed these; full bar → claim coin)
    oreCounts, setOreCounts, addOre, claimOreCoin,
    // Tarot daily / bonus state
    hangedManUsed, setHangedManUsed,
    hangedManDate, setHangedManDate,
    buff,
    toggleTarot,
    // Vault / forge / shrine
    shrineSelection, setShrineSelection,
    shrinePicker, setShrinePicker,
    sacrificialCoins,
    forgeArtefact,
    forgeUp, canAfford, repairPickaxe, buyNewPickaxe, NEW_PICKAXE_COST,
    sellCoin, bulkSell, toggleLock, togglePin, pinToSlot, pinCoinToSlot, clearPinSlot,
    // Tavern (gambling — currently mostly disabled)
    gambMode, setGambMode,
    betIds, setBetIds, betCoins, toggleBet,
    gambPhase, setGambPhase,
    gambResult, setGambResult,
    gamble, doGamble, gambOk, resetGamble,
    roulBetId, setRoulBetId, roulBetCoin,
    roulResult, setRoulResult,
    roulDone, setRoulDone, onRoulResult, resetRoulette,
    buyFrame, buyTarot, buyTitle,
    // Social
    searchQ, setSearchQ,
    searchResults, setSearchResults,
    searching,
    friendsList, setFriendsList,
    followersList, setFollowersList,
    viewingProfile, setViewingProfile,
    profileData, setProfileData,
    profileLoading, setProfileLoading,
    profileErr, setProfileErr,
    editingProfile, setEditingProfile,
    handleAddFriend, handleRemoveFriend,
    // Duels
    duelsList, setDuelsList,
    duelStakeIntent, setDuelStakeIntent,
    duelResult, setDuelResult,
    refreshDuels,
    promptCreateDuel, promptAcceptDuel, submitStake,
    declineDuel, flipDuel,
    // Effects/animations
    scrapFlyers, setScrapFlyers,
    digBudgetRef,
    marksCounterRef,
    // Derived values
    level, xpPct, xpIn, xpRange,
    // Auth lifecycle
    handleAuthed, handleLogout,
    // Imported (re-exposed for screens that need them via context only)
    METALS, RARITIES, RARITY_COLOR, SHAPES, SHAPE_NAMES, CONDS,
    BANNERS, FRAMES, ARTEFACTS, ARTEFACT_GRADES, ARTEFACT_FORGE_COST,
    PREMIUM_TITLES, PREMIUM_TITLE_BY_ID, PREMIUM_TITLE_LABELS,
    SHOVEL_UPS, SHOVEL_TIER_CAP, SHOVEL_MAX_DUR,
    BRUSH_UPS, MAX_SH, MAX_BR, MAX_TIER,
    TAROT_CARDS, TAROT_BY_ID, MAX_EQUIPPED_TAROTS,
    TITLES, TITLE_LEVELS,
    GRID, SENSE_PHRASES,
  };

  return(
    <GameContext.Provider value={g}>
    <div style={{...F,minHeight:"100vh",background:t.bg,color:t.text,paddingBottom:"calc(78px + env(safe-area-inset-bottom,0px))",position:"relative"}}>
      <div className="noise-overlay" style={{position:"fixed",zIndex:1,opacity:t.noiseOpacity}}/>

      {/* Schema warning banner — surfaced when the server tells us a migration is missing */}
      {schemaWarning&&(
        <div style={{padding:"10px 14px",background:"#3a1a08",borderBottom:`1px solid ${t.danger}55`,...F,fontSize:12,color:"#ffb060",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:85}}>
          <span style={{fontSize:16,flexShrink:0}}>⚠</span>
          <div style={{flex:1,lineHeight:1.4}}>
            <div style={{fontWeight:700,marginBottom:2}}>Database migration pending</div>
            <div style={{fontSize:11,color:"#d8a070",lineHeight:1.4}}>{schemaWarning}</div>
          </div>
          <button onClick={()=>setSchemaWarning(null)} style={{border:"none",background:"transparent",color:"#ffb060",cursor:"pointer",fontSize:18,padding:4,lineHeight:1}}>×</button>
        </div>
      )}

      {/* ═══ TOP BAR ═══ */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px 14px",borderBottom:`1px solid ${t.border}`,background:t.nav,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:80}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:36,height:36,background:`linear-gradient(135deg,${t.surfaceHi},${t.surface})`,border:`1px solid ${t.borderHi}`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`inset 0 1px 0 rgba(255,255,255,.06)`}}>
            <span style={{...FR,fontSize:18,fontWeight:900,color:t.accent,letterSpacing:-1}}>⚒</span>
          </div>
          <div>
            <div style={{...FR,fontWeight:900,fontSize:17,letterSpacing:-.5,lineHeight:1,color:t.text}}>MINTFORGE</div>
            <div style={{...VT,fontSize:13,color:t.muted,letterSpacing:4,marginTop:2}}>{rune("MINTFORGE")}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,justifyContent:"flex-end",marginBottom:4}}>
              <MarksCounter marks={marks} marksCounterRef={marksCounterRef} t={t} F={F}/>
              <span style={{...F,fontSize:10,color:t.textDim,fontWeight:600,letterSpacing:1,textTransform:"uppercase",opacity:.55}}>·</span>
              <span style={{background:`linear-gradient(135deg,${t.accentHi},${t.accent})`,color:t.accentInk,fontWeight:900,fontSize:10,padding:"2px 8px",borderRadius:4,letterSpacing:1,boxShadow:"0 1px 2px rgba(0,0,0,.2)"}}>LV {level}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:104,height:5,background:t.faint,borderRadius:3,overflow:"hidden",border:`1px solid ${t.border}`}}>
                <div style={{width:`${xpPct}%`,height:"100%",background:`linear-gradient(to right,${t.accentDim},${t.accent},${t.accentHi})`,transition:"width .6s",boxShadow:`0 0 6px ${t.accent}66`}}/>
              </div>
              <span style={{...F,fontSize:9,color:t.muted,fontWeight:600,letterSpacing:.5,fontVariantNumeric:"tabular-nums"}}>{xpIn}/{xpRange}</span>
            </div>
          </div>
          <button onClick={()=>setIsDark(d=>!d)} style={{width:36,height:36,borderRadius:10,border:`1px solid ${t.border}`,background:t.surfaceHi,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",color:t.text}} onMouseEnter={e=>e.currentTarget.style.borderColor=t.borderHi} onMouseLeave={e=>e.currentTarget.style.borderColor=t.border}>
            {isDark?"☀":"☾"}
          </button>
          <button onClick={()=>{if(confirm("Sign out? Your vault stays saved."))handleLogout();}} title="Sign out" style={{width:36,height:36,borderRadius:10,border:`1px solid ${t.border}`,background:t.surfaceHi,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",color:t.muted}} onMouseEnter={e=>{e.currentTarget.style.borderColor=t.borderHi;e.currentTarget.style.color=t.textDim;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.color=t.muted;}}>
            ⎋
          </button>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{maxWidth:480,margin:"0 auto",padding:"18px 14px 8px",position:"relative",zIndex:2}}>

        {/* ─── PROFILE ─── */}
        {tab==="profile" && <Profile/>}

        {/* ─── SOCIAL ─── */}
        {tab==="social" && <Social/>}

        {/* ─── VAULT ─── */}
        {tab==="vault" && <Vault/>}

        {/* ─── HUNT ─── */}
        {tab==="hunt" && <Hunt/>}

        {/* ─── FORGE ─── */}
        {/* ─── TAVERN ─── */}
        {/* ─── SHRINE ─── */}
        {tab==="shrine" && <Shrine/>}

        {/* ─── TAVERN ─── */}
      </div>

      <BottomNav tab={tab} setTab={setTab} huntActive={phase==="dig"||phase==="brush"} t={t}/>

      <LuckyFanfare show={showLucky} onDone={()=>setShowLucky(false)}/>

      {/* Duel stake picker — opens when challenging or accepting. Filters the vault
          to legal stakes (unlocked coins; for accepts, within tier gap). */}
      {duelStakeIntent&&(()=>{
        const eligible=coins.filter(c=>{
          if(c.locked)return false;
          if(duelStakeIntent.kind==="accept"){
            return Math.abs(c.metalIdx-duelStakeIntent.opposingMetalIdx)<=1;
          }
          return true;
        });
        const close=()=>setDuelStakeIntent(null);
        return(
          <div onClick={close} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.78)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadein .18s ease",padding:"20px 12px"}}>
            <div onClick={e=>e.stopPropagation()} style={{...card,width:"100%",maxWidth:480,maxHeight:"80vh",overflowY:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:12,animation:"slideUp .22s ease",borderColor:t.borderHi}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{...sectionTitle,fontSize:16}}>{duelStakeIntent.kind==="create"?"Stake a Coin":"Match Their Stake"}</div>
                <button onClick={close} style={{padding:"4px 10px",borderRadius:6,border:"none",background:"transparent",cursor:"pointer",...F,fontSize:18,color:t.muted,lineHeight:1}}>✕</button>
              </div>
              <div style={{...mu,fontSize:12,fontStyle:"italic",lineHeight:1.5}}>
                {duelStakeIntent.kind==="create"
                  ? <>Choose a coin to wager against <b>{duelStakeIntent.friendUsername}</b>. They\'ll see your stake and match with one of their own.</>
                  : <>Pick a coin within one tier of their stake. Locked coins are excluded.</>}
              </div>
              {duelStakeIntent.error&&<div style={{padding:"8px 10px",borderRadius:7,background:isDark?"#2a0808":"#fbe8e8",border:`1px solid ${t.danger}`,color:t.danger,...F,fontSize:11,fontWeight:600}}>{duelStakeIntent.error}</div>}
              {eligible.length===0?(
                <div style={{textAlign:"center",padding:"24px 18px",...mu,fontSize:13,fontStyle:"italic",opacity:.7}}>No eligible coins. {duelStakeIntent.kind==="accept"?"Their stake is at a tier you don\'t have nearby.":"Unlock a coin or hunt for one."}</div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(72px,1fr))",gap:8}}>
                  {eligible.map(c=>(
                    <button key={c.id} onClick={()=>submitStake(c.id)} style={{padding:7,borderRadius:9,border:`1px solid ${t.border}`,background:t.surfaceHi,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=t.accent;e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.transform="";}}>
                      <CoinCanvas coin={c} size={48}/>
                      <span style={{...microLabel,fontSize:8,color:RARITY_COLOR[RARITIES[coinRarity(c)]?.id||"common"],letterSpacing:1}}>{RARITIES[coinRarity(c)]?.name||"COMMON"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Duel result modal — shown after a flip resolves. Three flip-cards
          appear in sequence (CSS staggered fade), then the winner is announced. */}
      {duelResult&&(()=>{
        const close=()=>setDuelResult(null);
        const {flips,won,winnerUsername,duel}=duelResult;
        return(
          <div onClick={close} style={{position:"fixed",inset:0,zIndex:210,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadein .25s ease",padding:"20px 16px"}}>
            <div onClick={e=>e.stopPropagation()} style={{...card,width:"100%",maxWidth:420,padding:"22px 18px",display:"flex",flexDirection:"column",alignItems:"center",gap:18,borderColor:won?t.success:t.danger,boxShadow:`0 0 30px ${won?t.success:t.danger}33`}}>
              <div style={{...sectionTitle,fontSize:20,letterSpacing:2,color:won?t.success:t.danger,textShadow:`0 0 14px ${won?t.success:t.danger}55`,animation:"fadein .4s ease .8s both"}}>
                {won?"⚔ VICTORY":"⚔ DEFEAT"}
              </div>
              {/* Three flip outcomes — staggered reveal */}
              <div style={{display:"flex",gap:11,alignItems:"center",justifyContent:"center"}}>
                {(flips||[]).map((f,i)=>{
                  if(f===null)return(
                    <div key={i} style={{width:48,height:48,borderRadius:"50%",border:`2px dashed ${t.border}`,opacity:0.3,animation:`fadein .3s ease ${0.2+i*0.35}s both`}}/>
                  );
                  // f === true means challenger won that flip
                  const myFlipWon=duel.role==="challenger"?f:!f;
                  return(
                    <div key={i} style={{width:54,height:54,borderRadius:"50%",border:`2px solid ${myFlipWon?t.success:t.danger}`,background:`radial-gradient(circle at 35% 35%,${myFlipWon?t.success:t.danger}55,${myFlipWon?t.success:t.danger}11)`,display:"flex",alignItems:"center",justifyContent:"center",...F,fontSize:22,fontWeight:900,color:myFlipWon?t.success:t.danger,boxShadow:`0 0 14px ${myFlipWon?t.success:t.danger}55`,animation:`flipReveal .5s cubic-bezier(.45,1.6,.55,1) ${0.2+i*0.35}s both`,transformOrigin:"center"}}>{myFlipWon?"✓":"✗"}</div>
                  );
                })}
              </div>
              {/* Coins won/lost */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,animation:"fadein .4s ease 1.6s both"}}>
                {duel.challengerCoin&&(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <CoinCanvas coin={duel.challengerCoin} size={56}/>
                    <span style={{...microLabel,fontSize:8,color:t.muted}}>{duel.challengerUsername}</span>
                  </div>
                )}
                <span style={{fontSize:18,...F,fontWeight:700,color:t.muted,opacity:.5}}>vs</span>
                {duel.challengedCoin&&(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <CoinCanvas coin={duel.challengedCoin} size={56}/>
                    <span style={{...microLabel,fontSize:8,color:t.muted}}>{duel.challengedUsername}</span>
                  </div>
                )}
              </div>
              <div style={{...mu,fontSize:13,textAlign:"center",fontStyle:"italic",lineHeight:1.55,maxWidth:300,animation:"fadein .4s ease 1.8s both"}}>
                {won
                  ? <>Both coins are yours. <b>{winnerUsername}</b> claims the spoils.</>
                  : <>The fates favoured <b>{winnerUsername}</b>. Your stake has changed hands.</>}
              </div>
              <button onClick={close} style={{padding:"9px 22px",borderRadius:9,border:`1px solid ${t.borderHi}`,background:t.surfaceHi,cursor:"pointer",...F,fontSize:11,fontWeight:800,color:t.text,letterSpacing:2,textTransform:"uppercase",animation:"fadein .3s ease 2s both"}}>Close</button>
            </div>
          </div>
        );
      })()}
      {/* Flying scrap animation — fixed-position overlay, one element per dug cell.
          Each flyer arcs from cell origin toward the marks counter, with floating
          "+◈ N scrap" text near the origin. Timing is tuned so marks ticker fires
          ~75% through the flight (700ms) and the element vanishes at 1000ms. */}
      {scrapFlyers.length>0&&(
        <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:170}}>
          {scrapFlyers.map(f=>(
            <div key={f.id}>
              <div style={{position:"fixed",left:f.startX,top:f.startY,fontSize:22,filter:"drop-shadow(0 2px 6px rgba(0,0,0,.7))",animation:"scrapFly 1s cubic-bezier(.45,.05,.55,.95) forwards",pointerEvents:"none",willChange:"transform",["--dx"]:`${f.dx}px`,["--dy"]:`${f.dy}px`}}>⚙</div>
              <div style={{position:"fixed",left:f.startX,top:f.startY-8,...F,fontSize:13,fontWeight:800,color:"#f0c850",letterSpacing:.5,textShadow:"0 1px 4px rgba(0,0,0,.85),0 0 10px rgba(212,160,23,.6)",pointerEvents:"none",animation:"scrapText .85s ease-out forwards",whiteSpace:"nowrap"}}>
                Scrap +◈{f.amount}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cabinet slot picker — opens when an empty cabinet slot is tapped.
          Shows all coins, tapping one assigns it to the slot. */}
      {pickerSlot!==null&&(
        <div onClick={()=>setPickerSlot(null)} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.7)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadein .18s ease",padding:"24px 12px"}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:520,maxHeight:"80vh",background:t.surface,border:`1px solid ${t.borderHi}`,borderRadius:16,boxShadow:"0 -12px 40px rgba(0,0,0,.6)",display:"flex",flexDirection:"column",animation:"slideUp .25s cubic-bezier(.2,.8,.3,1)"}}>
            <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{...FR,fontWeight:800,fontSize:16,letterSpacing:-.2,color:t.text}}>Choose a coin</div>
                <div style={{...mu,fontSize:11,marginTop:2,fontStyle:"italic"}}>Slot {pickerSlot+1} · {coins.length} coins available</div>
              </div>
              <button onClick={()=>setPickerSlot(null)} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${t.border}`,background:t.surfaceHi,cursor:"pointer",...F,fontSize:14,color:t.muted,padding:0,lineHeight:1}}>×</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"12px"}}>
              {coins.length===0?(
                <div style={{...mu,fontSize:13,fontStyle:"italic",textAlign:"center",padding:"32px 0"}}>No coins yet — go hunt some!</div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(82px,1fr))",gap:7}}>
                  {[...coins].sort((a,b)=>b.metalIdx-a.metalIdx||(b.shiny?1:0)-(a.shiny?1:0)).map(c=>{
                    const m=METALS[c.metalIdx];
                    const alreadyPinned=pinnedIds?.includes(c.id);
                    return(
                      <button key={c.id} onClick={()=>pinToSlot(pickerSlot,c.id)} className={c.shiny?"shiny-card":""} style={{position:"relative",padding:"8px 4px 5px",borderRadius:9,border:`1px solid ${alreadyPinned?t.accent:m.eng+"40"}`,background:isDark?`linear-gradient(160deg,${m.dark}30,${t.surface})`:t.surface,cursor:"pointer",transition:"transform .12s, border-color .12s",overflow:"visible"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=t.borderHi;}} onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor=alreadyPinned?t.accent:m.eng+"40";}}>
                        {c.shiny&&<div className="shiny-aura"/>}
                        {c.metalIdx>=7&&<div className={`ambient-particles ${c.metalIdx===8?"astral":"eldritch"}`}><span/><span/><span/></div>}
                        {alreadyPinned&&<div style={{position:"absolute",top:3,right:3,...F,fontSize:7,fontWeight:800,letterSpacing:1,color:t.accent,background:`${t.surface}dd`,padding:"1px 4px",borderRadius:3,zIndex:2}}>PINNED</div>}
                        <div style={{display:"flex",justifyContent:"center",marginBottom:4}}><CoinCanvas coin={c} size={48}/></div>
                        <div style={{...microLabel,fontSize:7,color:m.hl,opacity:.7,letterSpacing:1}}>{m.name}{c.shiny?" ✦":""}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shrine forge picker — pick exactly 5 coins of one metal to forge an artefact */}
      {shrinePicker&&(()=>{
        const m=METALS[shrinePicker.metalIdx];
        const def=ARTEFACTS[shrinePicker.metalIdx];
        const baseCost=ARTEFACT_FORGE_COST[shrinePicker.metalIdx];
        const cost=Math.max(1,Math.round(baseCost*(1-(buff.forgeDiscount||0))));
        const close=()=>{setShrinePicker(null);setShrineSelection([]);};
        // Preview the grade we'd get with current selection
        const inputs=shrineSelection.map(id=>coins.find(c=>c.id===id)).filter(Boolean);
        const avgRarity=inputs.length>0?inputs.reduce((s,c)=>s+coinRarity(c),0)/inputs.length:0;
        const previewGrade=ARTEFACT_GRADES[gradeForRaritySum(avgRarity)];
        const ready=shrineSelection.length===5&&marks>=cost;
        return(
          <div onClick={close} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.78)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadein .18s ease",padding:"20px 12px"}}>
            <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:520,maxHeight:"85vh",background:t.surface,border:`1px solid ${m.eng}88`,borderRadius:16,boxShadow:"0 -12px 40px rgba(0,0,0,.6)",display:"flex",flexDirection:"column",animation:"slideUp .25s cubic-bezier(.2,.8,.3,1)"}}>
              <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:46,height:46,borderRadius:11,background:isDark?`linear-gradient(135deg,${m.dark},${m.mid})`:`linear-gradient(135deg,${m.mid},${m.base})`,border:`1px solid ${m.eng}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:m.hl,fontFamily:"'Fraunces',serif",flexShrink:0,overflow:"hidden"}}>{def.art?<img src={`/artefacts/${def.art}.webp`} alt={def.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:def.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{...FR,fontWeight:800,fontSize:16,letterSpacing:-.2,color:t.text}}>Forge {def.name}</div>
                  <div style={{...mu,fontSize:11,marginTop:1,fontStyle:"italic"}}>{def.desc}</div>
                </div>
                <button onClick={close} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${t.border}`,background:t.surfaceHi,cursor:"pointer",...F,fontSize:14,color:t.muted,padding:0,lineHeight:1,flexShrink:0}}>×</button>
              </div>
              <div style={{padding:"10px 14px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:t.surfaceHi}}>
                <div>
                  <div style={{...microLabel,fontSize:9}}>Selected</div>
                  <div style={{...FR,fontWeight:800,fontSize:18,color:shrineSelection.length===5?t.success:t.text,letterSpacing:-.5}}>{shrineSelection.length} / 5</div>
                </div>
                {shrineSelection.length>0&&(
                  <div style={{textAlign:"right"}}>
                    <div style={{...microLabel,fontSize:9}}>Preview Grade</div>
                    <div style={{...FR,fontWeight:800,fontSize:14,color:previewGrade.color,letterSpacing:.3}}>{previewGrade.name}</div>
                  </div>
                )}
                <div style={{textAlign:"right"}}>
                  <div style={{...microLabel,fontSize:9}}>Cost</div>
                  <div style={{...F,fontWeight:800,fontSize:13,color:marks>=cost?t.accent:t.danger,letterSpacing:.3,fontVariantNumeric:"tabular-nums"}}>◈ {cost.toLocaleString()}</div>
                </div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"12px"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))",gap:7}}>
                  {[...shrinePicker.available].sort((a,b)=>coinRarity(b)-coinRarity(a)||(b.shiny?1:0)-(a.shiny?1:0)).map(c=>{
                    const sel=shrineSelection.includes(c.id);
                    const r=RARITIES[coinRarity(c)];
                    const cantSelect=!sel&&shrineSelection.length>=5;
                    return(
                      <button key={c.id} disabled={cantSelect} onClick={()=>{
                        setShrineSelection(prev=>{
                          if(prev.includes(c.id))return prev.filter(x=>x!==c.id);
                          if(prev.length>=5)return prev;
                          return [...prev,c.id];
                        });
                      }} className={c.shiny?"shiny-card":""} style={{position:"relative",padding:"7px 4px 5px",borderRadius:9,border:`1px solid ${sel?t.accent:r.color+"55"}`,background:sel?`${t.accent}22`:isDark?`linear-gradient(160deg,${m.dark}30,${t.surface})`:t.surface,cursor:cantSelect?"not-allowed":"pointer",opacity:cantSelect?.4:1,transition:"all .12s",overflow:"visible",boxShadow:sel?`0 0 0 2px ${t.accent}66`:"none"}}>
                        {c.shiny&&<div className="shiny-aura"/>}
                        {sel&&<div style={{position:"absolute",top:3,right:3,width:16,height:16,borderRadius:"50%",background:t.accent,color:t.accentInk,...F,fontSize:10,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",zIndex:3}}>✓</div>}
                        <div style={{display:"flex",justifyContent:"center",marginBottom:3}}><CoinCanvas coin={c} size={42}/></div>
                        <div style={{...microLabel,fontSize:6.5,color:r.color,fontWeight:800,letterSpacing:1}}>{r.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{padding:"12px 14px",borderTop:`1px solid ${t.border}`}}>
                <button onClick={()=>{
                  if(!ready)return;
                  const result=forgeArtefact(shrineSelection);
                  if(result.ok){close();}
                }} disabled={!ready} style={{width:"100%",padding:"12px 0",borderRadius:10,border:`1px solid ${ready?m.eng:t.border}`,background:ready?`linear-gradient(135deg,${m.dark},${m.mid})`:t.surfaceHi,cursor:ready?"pointer":"not-allowed",...F,fontWeight:800,fontSize:13,color:ready?m.hl:t.muted,letterSpacing:2,textTransform:"uppercase"}}>{shrineSelection.length<5?`Pick ${5-shrineSelection.length} more`:marks<cost?`Need ◈ ${cost.toLocaleString()}`:"✦ Forge Artefact"}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
    </GameContext.Provider>
  );
}
