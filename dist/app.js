const menuButton=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#navigation');
function closeMenu(){navigation.classList.remove('open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open navigation');}
menuButton?.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';navigation.classList.toggle('open',open);menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
navigation?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&navigation?.classList.contains('open')){closeMenu();menuButton.focus();}});
const grades={8:{title:'A strong start.\nA world of possibility.',description:'Build your foundations with clear explanations, regular practice and space to ask every question.',focus:'Foundations & everyday study habits'},9:{title:'Build on the basics.\nReach a little further.',description:'Connect new ideas, strengthen your problem-solving skills and build the habits you’ll take into your board year.',focus:'Concept clarity & problem solving'},10:{title:'Your board year.\nYour breakthrough.',description:'Build clarity chapter by chapter, practise board-style questions, and walk into your exams feeling prepared.',focus:'Concepts, practice & revision'},11:{title:'New subjects.\nBigger possibilities.',description:'Navigate the step into higher secondary with structured learning, deeper explanations and regular academic support.',focus:'Higher secondary foundations'},12:{title:'Finish strong.\nStep forward with confidence.',description:'Bring your learning together with focused board preparation, previous-year questions and dedicated doubt discussions.',focus:'Board preparation & focused revision'}};
document.querySelectorAll('[data-grade]').forEach(button=>button.addEventListener('click',()=>{const grade=button.dataset.grade;const content=grades[grade];document.querySelectorAll('[data-grade]').forEach(b=>{b.setAttribute('aria-pressed',String(b===button));b.querySelector('i')?.remove();});const arrow=document.createElement('i');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');button.append(arrow);document.querySelector('#grade-label').textContent=`CLASS ${grade}`;const title=document.querySelector('#grade-title');title.replaceChildren();content.title.split('\n').forEach((line,i)=>{if(i)title.append(document.createElement('br'));title.append(document.createTextNode(line));});document.querySelector('#grade-description').textContent=content.description;document.querySelector('#grade-focus').textContent=content.focus;document.querySelector('#grade-enquiry').textContent=`Enquire about Class ${grade} ↗`;}));
const centres={kadavanthra:['Kadavanthra','9207076473','dHgturY8vL8KXyhM9'],chullickal:['Chullickal','7907126725','fPcDGwooDWMdMyQj8'],eraveli:['Eraveli','8714446244','T7BtN9yKTBg9dGS47'],thoppumpady:['Thoppumpady','9895085731','avuWtnrD2aYmXLnb6'],palluruthy:['Palluruthy','8129179749','nqiTJA4cjZeExYHe9'],moolamkuzhi:['Moolamkuzhi','7736423463','GhSUr39w1vyMvzLi7'],fortkochi:['Fort Kochi','8129508689','Jc21d9sY4MX177As9'],vennala:['Vennala','6282179991','7MRpY4dZUXRkj8gB8'],edappally:['Edappally',null,'Gp159hZFmEDV3xkb9'],pathadipalam:['Pathadipalam','8137859426',null]};
document.querySelector('#centre-select')?.addEventListener('change',event=>{const [name,phone,map]=centres[event.target.value];document.querySelector('#centre-name').textContent=`Smartup, ${name}`;const call=document.querySelector('#centre-call');call.href=`tel:+91${phone||'8891910919'}`;call.textContent=phone?'Call the centre ↗':'Call our main team ↗';const link=document.querySelector('#centre-map');link.hidden=!map;if(map)link.href=`https://maps.app.goo.gl/${map}`;else link.removeAttribute('href');document.querySelector('#centre-help').textContent=map?'Speak to the team for current batch timings.':'Call the centre for directions and current batch timings.';});
const owl=document.querySelector('.hero-film-footer img');const reduced=matchMedia('(prefers-reduced-motion: reduce)');const desktop=matchMedia('(min-width: 801px)');let scheduled=false;
function moveOwl(){scheduled=false;if(!owl||reduced.matches||!desktop.matches)return;const y=Math.min(window.scrollY,750);owl.style.transform=`translateY(${y*.015}px) rotate(${-9+y*.012}deg)`;}
window.addEventListener('scroll',()=>{if(!scheduled&&!reduced.matches&&desktop.matches){scheduled=true;requestAnimationFrame(moveOwl);}},{passive:true});
function resetMotion(){if(owl)owl.style.removeProperty('transform');moveOwl();}reduced.addEventListener('change',resetMotion);desktop.addEventListener('change',resetMotion);moveOwl();

// Click-to-load players keep video embeds out of the initial page request.
const players=[...document.querySelectorAll('.youtube-player')];
let activePlayer=null;
function closeVideo(player,restoreFocus=false){
 const frame=player.querySelector('iframe');if(!frame)return;
 frame.remove();const launch=player.querySelector('.video-launch');launch.hidden=false;player.querySelector('.video-close').hidden=true;
 if(activePlayer===player)activePlayer=null;if(restoreFocus)launch.focus();
}
players.forEach(player=>{
 const launch=player.querySelector('.video-launch');
 launch.addEventListener('click',event=>{
  if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();if(activePlayer&&activePlayer!==player)closeVideo(activePlayer);
  const frame=document.createElement('iframe');
  const params=new URLSearchParams({autoplay:'1',rel:'0',playsinline:'1',enablejsapi:'1',origin:location.origin});
  frame.src=`https://www.youtube-nocookie.com/embed/${player.dataset.video}?${params}`;
  frame.title=player.dataset.title;frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  launch.hidden=true;player.querySelector('.video-surface').append(frame);player.querySelector('.video-close').hidden=false;activePlayer=player;frame.focus();
 });
 player.querySelector('.video-close').addEventListener('click',()=>closeVideo(player,true));
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&activePlayer)closeVideo(activePlayer,true);});
function pauseVideo(player){player.querySelector('iframe')?.contentWindow?.postMessage(JSON.stringify({event:'command',func:'pauseVideo',args:[]}),'https://www.youtube-nocookie.com');}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&activePlayer)pauseVideo(activePlayer);});
if('IntersectionObserver' in window){const videoVisibility=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting&&activePlayer===entry.target)pauseVideo(entry.target);}),{threshold:0});players.forEach(player=>videoVisibility.observe(player));}
