const $=id=>document.getElementById(id);
let bank=[],round=[],idx=0,answers=[],chosen=null,currentUser="",avatarUrl="",avatarReady=false,avatarImage=null;
const API_URL="https://script.google.com/macros/s/AKfycbzolvzImrwig64NU4DFfaoNBEVS3VfsMQozVviMxjs8JnQZ05VV3D-U1_VQYKyHyicelg/exec";
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function cleanHandle(v){return v.trim().replace(/^@+/,"").toLowerCase()}
function validHandle(v){return /^[a-z0-9_]{1,15}$/.test(v)}
function avatarCandidates(handle){
 const x=`https://unavatar.io/x/${encodeURIComponent(handle)}`;
 return [
  `https://images.weserv.nl/?url=${encodeURIComponent(x)}&output=png`,
  `https://wsrv.nl/?url=${encodeURIComponent(x)}&output=png`,
  x
 ];
}
function setAvatarFallback(){
 ["sessionPfp","cardPfp"].forEach(id=>{
  const img=$(id);if(!img)return;
  const initial=(currentUser||"?").slice(0,1).toUpperCase();
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="60" fill="#ff82bd"/><text x="60" y="78" text-anchor="middle" font-family="Arial" font-size="64" font-weight="700" fill="#24131d">${initial}</text></svg>`;
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
  img.classList.add("avatar-fallback");
 });
 avatarImage=null;avatarReady=false;
}
function loadAvatar(){
 const candidates=avatarCandidates(currentUser);let index=0;
 setAvatarFallback();
 const tryNext=()=>{
  if(index>=candidates.length)return;
  const url=candidates[index++];avatarUrl=url;
  const im=new Image();im.crossOrigin="anonymous";
  im.onload=()=>{
   // Reject images that load visually but taint canvas export.
   try{const test=document.createElement("canvas");test.width=test.height=2;const tc=test.getContext("2d");tc.drawImage(im,0,0,2,2);tc.getImageData(0,0,1,1);}
   catch(_){tryNext();return;}
   avatarImage=im;avatarReady=true;
   ["sessionPfp","cardPfp"].forEach(id=>{
    const img=$(id);if(!img)return;
    img.onload=()=>img.classList.remove("avatar-fallback");
    img.onerror=()=>img.classList.add("avatar-fallback");
    img.src=url;
   });
  };
  im.onerror=tryNext;im.src=url;
 };
 tryNext();
}
function setProfile(){
 $("sessionUsername").textContent="@"+currentUser;
 $("cardUsername").textContent="@"+currentUser;
 $("sessionProfile").classList.remove("hidden");
 loadAvatar();
}
function waitForAvatar(){
 if(avatarReady)return Promise.resolve(true);
 return new Promise(resolve=>{
  const started=Date.now();
  const check=()=>{if(avatarReady)return resolve(true);if(Date.now()-started>10000)return resolve(false);setTimeout(check,150)};
  check();
 });
}
function apiCall(action,data={}){
 return new Promise((resolve,reject)=>{
  if(API_URL.includes("PASTE_YOUR")){reject(new Error("Google Sheets database is not connected yet. Add the deployed Apps Script URL in script.js."));return}
  const cb="itiaCb"+Date.now()+Math.floor(Math.random()*10000),s=document.createElement("script");
  const cleanup=()=>{delete window[cb];s.remove()};
  const timer=setTimeout(()=>{cleanup();reject(new Error("Database request timed out. Please try again."))},15000);
  window[cb]=result=>{clearTimeout(timer);cleanup();result&&result.ok?resolve(result):reject(new Error(result?.error||"Database request failed."))};
  const params=new URLSearchParams({action,callback:cb,handle:currentUser,...Object.fromEntries(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)]))});
  s.onerror=()=>{clearTimeout(timer);cleanup();reject(new Error("Could not reach the Google Sheets database."))};
  s.src=API_URL+"?"+params.toString();document.body.appendChild(s);
 });
}
function setStatus(msg,isError=false){$("username-help").textContent=msg;$("username-help").classList.toggle("error",isError)}
fetch("questions.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{bank=data;$("start").disabled=false}).catch(()=>$("start").textContent="Question bank unavailable");
const sharedHandle=new URLSearchParams(location.search).get("user");
if(sharedHandle){$("xUsername").value=sharedHandle;window.addEventListener("load",()=>{if(validHandle(cleanHandle(sharedHandle)))begin();});}
async function begin(){
 const handle=cleanHandle($("xUsername").value);
 if(!validHandle(handle)){setStatus("Enter a valid X username (1–15 letters, numbers or underscores).",true);return}
 currentUser=handle;$("start").disabled=true;setStatus("Checking your quiz record...");
 try{
  const record=await apiCall("enter");
  setProfile();
  if(record.status==="completed"){restoreRecord(record);showSavedResult(record.result||record);return}
  if(record.status==="in_progress"&&record.progress){restoreRecord(record);setStatus("Your saved quiz has been restored.");$("intro").classList.add("hidden");$("result").classList.add("hidden");if(idx>=10){await result();return}$("quiz").classList.remove("hidden");render();return}
  round=shuffle(bank).slice(0,10);idx=0;answers=[];await apiCall("start",{round});$("intro").classList.add("hidden");$("result").classList.add("hidden");$("quiz").classList.remove("hidden");render();
 }catch(e){setStatus(e.message,true);$("start").disabled=false}
}
function restoreRecord(record){
 round=record.progress?.round||record.round||[];answers=record.progress?.answers||[];idx=answers.length;
 if(!round.length)throw new Error("Saved quiz data is missing. Contact the quiz administrator.");
}
function showSavedResult(resultData){if(!resultData)return;answers=resultData.answers||[];round=resultData.round||[];renderResultData(resultData.score,resultData.rank,resultData.tagline);$("intro").classList.add("hidden");$("quiz").classList.add("hidden");$("result").classList.remove("hidden");$("actions").classList.add("hidden");$("reviewtitle").textContent="YOUR PREVIOUS ANSWERS";$("retryMessage").classList.remove("hidden")}
function render(){
 let q=round[idx];chosen=null;$("category").textContent=q.category.toUpperCase();$("progress").textContent=String(idx+1).padStart(2,"0")+" / 10";$("bar").style.width=(idx+1)*10+"%";$("question").textContent=q.q;$("hint").textContent="Choose one answer";$("next").disabled=true;$("next").textContent=idx===9?"See my result ↗":"Next question →";$("options").innerHTML="";
 let shown=shuffle(q.options.map((text,i)=>({text,correct:i===q.answer})));
 shown.forEach((o,i)=>{let b=document.createElement("button");b.className="option";let l=document.createElement("span");l.className="letter";l.textContent="ABCD"[i];let t=document.createElement("span");t.textContent=o.text;b.append(l,t);
  b.onclick=()=>{if(chosen)return;chosen=o;document.querySelectorAll(".option").forEach(x=>{x.disabled=true;x.classList.add("locked");x.classList.remove("selected")});b.classList.add("selected");$("next").disabled=false;$("hint").textContent="Answer locked in"};
  $("options").append(b);
 });
}
async function next(){
 if(!chosen)return;
 answers.push({q:round[idx],choice:chosen});$("next").disabled=true;
 try{await apiCall("save",{progress:{round,answers}})}catch(e){answers.pop();$("next").disabled=false;alert("Your answer could not be saved. Please try again.\n"+e.message);return}
 if(++idx<10)render();else await result();
}
function level(n){if(n<=2)return["ITIA NEWCOMER","Every journey starts somewhere."];if(n<=4)return["ITIA EXPLORER","You're getting to know the story behind the art."];if(n<=6)return["ITIA ENTHUSIAST","You know your way around the ITIA universe."];if(n<=8)return["ITIA FAMILY MEMBER","You understand the art, the people, and what brings them together."];if(n===9)return["ITIA INSIDER","You know ITIA beyond the surface."];return["ITIA LEGEND","You know the story, the details, and the feeling. ITIA is home."]}
function renderResultData(n,rank,tag){
 const resultCopy=`You got ${n} out of 10. ${n===10?"Perfect score. You really know ITIA.":"There's always more to discover about ITIA."}`;
 $("cardScore").textContent=n;$("cardRank").textContent=rank;$("cardTagline").textContent=tag;$("cardCopy").textContent=resultCopy;
 $("correct").textContent=n;$("wrong").textContent=10-n;$("accuracy").textContent=n*10+"%";
 $("review").innerHTML="";answers.forEach((a,i)=>{let d=document.createElement("div");d.className="reviewitem";let b=document.createElement("b");b.textContent=(i+1)+". "+a.q.q;let s=document.createElement("span");s.className=a.choice.correct?"right":"wrong";s.textContent=a.choice.correct?"✓ Correct":"✕ Incorrect";let small=document.createElement("small");small.textContent="Your answer: "+a.choice.text+(a.choice.correct?"":" · Correct answer: "+a.q.options[a.q.answer])+" — "+a.q.explanation;d.append(b,s,small);$("review").append(d)});
}
async function result(){
 let n=answers.filter(a=>a.choice.correct).length,[rank,tag]=level(n);
 try{await apiCall("complete",{result:{round,answers,score:n,rank,tagline:tag}})}catch(e){alert("Final result could not be saved. Keep this page open and try again.\n"+e.message);return}
 $("quiz").classList.add("hidden");$("result").classList.remove("hidden");$("retryMessage").classList.remove("hidden");renderResultData(n,rank,tag);
}
function share(){
  const n = answers.filter(a => a.choice.correct).length;
  const [rank] = level(n);

  const shareUrl = `https://itia-challenge.netlify.app/${encodeURIComponent(currentUser)}`;

  const post = `I participated in the “How Much Do You Know About ITIA?” challenge and scored ${n}/10.

${rank}! 🎨❤️

You know the story, the details, and the feeling. ITIA is home.

Be genuine. There is no retry, just share what you have got.

Think you know ITIA? @IThinkItsArt
Take the quiz:
${shareUrl}`;

  const intentUrl = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(post);

  window.open(intentUrl, "_blank", "noopener,noreferrer");
}
function roundedImage(ctx,img,x,y,w,h){ctx.save();ctx.beginPath();ctx.arc(x+w/2,y+h/2,w/2,0,Math.PI*2);ctx.clip();ctx.drawImage(img,x,y,w,h);ctx.restore()}
function cardCanvas(){
 const n=answers.filter(a=>a.choice.correct).length,[r,tag]=level(n),c=document.createElement("canvas");
 c.width=1200;c.height=630;const x=c.getContext("2d");
 const g=x.createLinearGradient(0,0,1200,630);g.addColorStop(0,"#332337");g.addColorStop(.55,"#201b28");g.addColorStop(1,"#111118");x.fillStyle=g;x.fillRect(0,0,1200,630);
 x.fillStyle="#ff82bd";x.globalAlpha=.16;x.beginPath();x.arc(1080,60,330,0,Math.PI*2);x.fill();x.globalAlpha=1;
 x.strokeStyle="#8a5874";x.lineWidth=3;x.strokeRect(30,30,1140,570);
 x.fillStyle="#fff";x.font="bold 30px Arial";x.fillText("ITIA",72,82);x.fillStyle="#d9b7ca";x.font="bold 17px Arial";x.textAlign="right";x.fillText("KNOWLEDGE CHALLENGE",1128,80);x.textAlign="left";
 if(avatarReady&&avatarImage)roundedImage(x,avatarImage,74,112,72,72);else{x.fillStyle="#ff82bd";x.beginPath();x.arc(110,148,36,0,Math.PI*2);x.fill();x.fillStyle="#24131d";x.font="bold 30px Arial";x.textAlign="center";x.fillText(currentUser.slice(0,1).toUpperCase(),110,159);x.textAlign="left"}
 x.fillStyle="#fff";x.font="bold 27px Arial";x.fillText("@"+currentUser,165,157);
 x.fillStyle="#ff82bd";x.font="bold 112px Arial";x.fillText(String(n).padStart(2,"0"),72,330);x.fillStyle="#ddd";x.font="bold 43px Arial";x.fillText("/10",235,326);
 const pillW=Math.max(190,x.measureText(r).width+46);x.fillStyle="#ff82bd";x.beginPath();x.roundRect(72,355,pillW,48,24);x.fill();x.fillStyle="#24131d";x.font="bold 20px Arial";x.fillText(r,94,387);
 x.fillStyle="#fff";x.font="bold 27px Arial";wrapCanvasText(x,tag,72,446,1050,34,2);
 x.fillStyle="#e6d8e1";x.font="20px Arial";wrapCanvasText(x,`You got ${n} out of 10. ${n===10?"Perfect score. You really know ITIA.":"There's always more to discover about ITIA."}`,72,510,1050,27,2);
 const stats=[[String(n),"CORRECT"],[String(10-n),"INCORRECT"],[String(n*10)+"%","ACCURACY"]];let sx=72;stats.forEach(a=>{x.fillStyle="#ffb6d7";x.font="bold 25px Arial";x.fillText(a[0],sx,574);x.fillStyle="#d9b7ca";x.font="bold 12px Arial";x.fillText(a[1],sx+58,574);sx+=330});
 x.fillStyle="#d1b6c6";x.font="bold 14px Arial";x.fillText("WHERE ART FEELS LIKE HOME · @IThinkItsArt",72,610);x.textAlign="right";x.fillStyle="#fff";x.fillText("DEVELOPED BY @lemonar777",1128,610);x.textAlign="left";return c;
}
function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight,maxLines=2){const words=String(text).split(/\s+/);let line="",lines=[];for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}if(line)lines.push(line);lines.slice(0,maxLines).forEach((v,i)=>ctx.fillText(v,x,y+i*lineHeight));}

$("start").disabled=true;$("start").onclick=begin;$("xUsername").addEventListener("keydown",e=>{if(e.key==="Enter"&&!$("start").disabled)begin()});$("next").onclick=next;$("share").onclick=share;

$("download").onclick = async () => {
  const btn = $("download");
  const oldText = btn.textContent;

  btn.disabled = true;
  btn.textContent = "Preparing card…";

  try {
    await waitForAvatar();

    const canvas = cardCanvas();

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(result => {
        if (result) resolve(result);
        else reject(new Error("PNG generation failed."));
      }, "image/png");
    });

    const file = new File(
      [blob],
      "itia-knowledge-score.png",
      { type: "image/png" }
    );

    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    // iPhone and iPad: use native share sheet.
    if (
      isIOS &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        files: [file],
        title: "My ITIA Challenge Result"
      });

    } else {
      // Android and desktop: download directly.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "itia-knowledge-score.png";
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Download error:", error);
      alert("Unable to download the score card. Please try again.");
    }
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
};
