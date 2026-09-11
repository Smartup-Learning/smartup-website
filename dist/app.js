const menuButton=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#navigation');
const mobileMenu=matchMedia('(max-width: 800px)');
function setMenuOpen(open){
 if(!open&&mobileMenu.matches&&navigation.contains(document.activeElement))menuButton.focus();
 navigation.classList.toggle('open',open);
 navigation.inert=mobileMenu.matches&&!open;
 menuButton.setAttribute('aria-expanded',String(open));
 menuButton.setAttribute('aria-label',open?'Close navigation':'Open navigation');
}
function closeMenu(){setMenuOpen(false);}
navigation.dataset.animated='true';
closeMenu();
mobileMenu.addEventListener('change',closeMenu);
menuButton?.addEventListener('click',()=>setMenuOpen(menuButton.getAttribute('aria-expanded')!=='true'));
navigation?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&navigation?.classList.contains('open')){closeMenu();menuButton.focus();}});
const grades={8:{title:'Start strong.',description:'Build foundations with clear explanations and regular practice.',focus:'Foundations & study habits'},9:{title:'Take the next step.',description:'Strengthen your concepts and problem-solving skills.',focus:'Concept clarity & problem solving'},10:{title:'Make your board year count.',description:'Clear concepts, board-style practice and focused revision.',focus:'Concepts, practice & revision'},11:{title:'Open up new possibilities.',description:'Navigate higher secondary subjects with structured support.',focus:'Higher secondary foundations'},12:{title:'Finish with confidence.',description:'Focused board preparation, previous-year papers and doubt discussions.',focus:'Board preparation & revision'}};
document.querySelectorAll('[data-grade]').forEach(button=>button.addEventListener('click',()=>{const grade=button.dataset.grade;const content=grades[grade];document.querySelectorAll('[data-grade]').forEach(b=>{b.setAttribute('aria-pressed',String(b===button));b.querySelector('i')?.remove();});const arrow=document.createElement('i');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');button.append(arrow);document.querySelector('#grade-label').textContent=`CLASS ${grade}`;const title=document.querySelector('#grade-title');title.replaceChildren();content.title.split('\n').forEach((line,i)=>{if(i)title.append(document.createElement('br'));title.append(document.createTextNode(line));});document.querySelector('#grade-description').textContent=content.description;document.querySelector('#grade-focus').textContent=content.focus;document.querySelector('#grade-enquiry').textContent=`Enquire about Class ${grade} ↗`;}));
const centres={kadavanthra:['Kadavanthra','9207076473','dHgturY8vL8KXyhM9'],chullickal:['Chullickal','7907126725','fPcDGwooDWMdMyQj8'],eraveli:['Eraveli','8714446244','T7BtN9yKTBg9dGS47'],thoppumpady:['Thoppumpady','9895085731','avuWtnrD2aYmXLnb6'],palluruthy:['Palluruthy','8129179749','nqiTJA4cjZeExYHe9'],moolamkuzhi:['Moolamkuzhi','7736423463','GhSUr39w1vyMvzLi7'],fortkochi:['Fort Kochi','8129508689','Jc21d9sY4MX177As9'],vennala:['Vennala','6282179991','7MRpY4dZUXRkj8gB8'],edappally:['Edappally',null,'Gp159hZFmEDV3xkb9'],pathadipalam:['Pathadipalam','8137859426',null]};
document.querySelector('#centre-select')?.addEventListener('change',event=>{const [name,phone,map]=centres[event.target.value];document.querySelector('#centre-name').textContent=`Smartup, ${name}`;const call=document.querySelector('#centre-call');call.href=`tel:+91${phone||'8891910919'}`;call.textContent=phone?'Call the centre ↗':'Call our main team ↗';const link=document.querySelector('#centre-map');link.hidden=!map;if(map)link.href=`https://maps.app.goo.gl/${map}`;else link.removeAttribute('href');document.querySelector('#centre-help').textContent=map?'Speak to the team for current batch timings.':'Call the centre for directions and current batch timings.';});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');

// Click-to-load players keep video embeds out of the initial page request.
const players=[...document.querySelectorAll('.youtube-player')];
let activePlayer=null;
function resetVideo(player){
 const frame=player.querySelector('iframe');if(!frame)return;
 frame.remove();player.querySelector('.video-launch').hidden=false;
 if(activePlayer===player)activePlayer=null;
}
players.forEach(player=>{
 const launch=player.querySelector('.video-launch');
 launch.addEventListener('click',event=>{
  if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();if(activePlayer&&activePlayer!==player)resetVideo(activePlayer);
  const frame=document.createElement('iframe');
  const params=new URLSearchParams({autoplay:'1',controls:'1',rel:'0',playsinline:'1',enablejsapi:'1',origin:location.origin});
  frame.src=`https://www.youtube-nocookie.com/embed/${player.dataset.video}?${params}`;
  frame.title=player.dataset.title;frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  launch.hidden=true;player.querySelector('.video-surface').append(frame);activePlayer=player;frame.focus();
 });
});
function pauseVideo(player){player.querySelector('iframe')?.contentWindow?.postMessage(JSON.stringify({event:'command',func:'pauseVideo',args:[]}),'https://www.youtube-nocookie.com');}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&activePlayer)pauseVideo(activePlayer);});
if('IntersectionObserver' in window){const videoVisibility=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting&&activePlayer===entry.target)pauseVideo(entry.target);}),{threshold:0});players.forEach(player=>videoVisibility.observe(player));}

// Every content rail has the same manual, keyboard-accessible navigation.
document.querySelectorAll('[data-carousel]').forEach(section=>{
 const track=section.querySelector('.carousel-track');
 const controls=section.querySelector('.carousel-actions');
 const previous=controls.querySelector('[data-direction="-1"]');
 const next=controls.querySelector('[data-direction="1"]');
 let queued=false;
 function update(){
  queued=false;
  const max=Math.max(0,track.scrollWidth-track.clientWidth);
  controls.hidden=max<2;track.tabIndex=max<2?-1:0;
  previous.disabled=track.scrollLeft<2;next.disabled=track.scrollLeft>=max-2;
 }
 function move(direction){
  const max=Math.max(0,track.scrollWidth-track.clientWidth);
  const left=track.getBoundingClientRect().left+parseFloat(getComputedStyle(track).paddingLeft);
  const stops=[...track.children].map(card=>card.getBoundingClientRect().left-left+track.scrollLeft);
  const target=direction>0?stops.find(x=>x>track.scrollLeft+4)??max:stops.filter(x=>x<track.scrollLeft-4).at(-1)??0;
  track.scrollTo({left:Math.max(0,Math.min(max,target)),behavior:reduced.matches?'instant':'smooth'});
 }
 controls.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>move(Number(button.dataset.direction))));
 track.addEventListener('keydown',event=>{
  if(event.target!==track)return;
  if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}
  if(event.key==='Home'||event.key==='End'){event.preventDefault();track.scrollTo({left:event.key==='Home'?0:track.scrollWidth,behavior:reduced.matches?'instant':'smooth'});}
 });
 track.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});
 if('ResizeObserver' in window)new ResizeObserver(update).observe(track);else window.addEventListener('resize',update);
 update();
});
