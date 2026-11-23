export const reciters = [
  {id:'ar.alafasy', name:'Mishary Rashid Alafasy', short:'Alafasy', bitrate:128},
  {id:'ar.husary', name:'Mahmoud Khalil Al-Husary', short:'Al-Husary', bitrate:128},
  {id:'ar.abdulbasitmurattal', name:'Abdul Basit Abdus Samad', short:'Abdul Basit', bitrate:192},
];
export const getReciter = id => reciters.find(r=>r.id===id)||reciters[0];
export const recitationURL = (number,reciter) => {
  const r=getReciter(reciter);
  if(!Number.isInteger(number)||number<1||number>6236)throw new Error('Invalid ayah number.');
  return `https://cdn.islamic.network/quran/audio/${r.bitrate}/${r.id}/${number}.mp3`;
};

// The reader and feed share one Audio element. Only an active session may advance it.
export class RecitationSession {
  constructor({audio,load,preferences,onChange=()=>{}}){
    this.audio=audio;this.load=load;this.preferences=preferences;this.onChange=onChange;
    this.enabled=false;this.version=0;this.current=1;this.start=1;this.end=1;this.repeat=1;this.completed=0;this.status='idle';this.wantsPlay=false;this.post=null;
    for(const event of ['timeupdate','loadedmetadata','play','pause','waiting','playing'])audio.addEventListener(event,()=>{
      if(!this.enabled)return;
      if(event==='play'&&!this.wantsPlay){audio.pause();return;}
      if(event==='playing')this.status='playing';
      if(event==='waiting'&&this.wantsPlay)this.status='loading';
      this.notify();
    });
    audio.addEventListener('ended',()=>{if(this.enabled&&this.wantsPlay)this.advance();});
    audio.addEventListener('error',()=>{if(this.enabled){this.wantsPlay=false;this.status='error';this.notify();}});
  }
  notify(){this.onChange(this);}
  activate(surah,count,ayah=1){
    this.deactivate();this.enabled=true;this.surah=surah;this.count=count;this.start=1;this.end=count;
    this.current=Math.max(1,Math.min(count,ayah));this.repeat=1;this.completed=0;this.status='idle';this.post=null;
  }
  deactivate(){this.enabled=false;this.version++;this.wantsPlay=false;this.audio.pause();this.status='idle';}
  setRange(start,end){
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end>this.count||start>end)throw new Error('Choose a valid ayah range.');
    this.pause();this.start=start;this.end=end;this.completed=0;
    if(this.current<start||this.current>end)this.current=start;
    this.notify();
  }
  setRepeat(value){
    const n=value==='forever'?Infinity:Number(value);
    if(![1,3,5,Infinity].includes(n))throw new Error('Choose a supported repeat count.');
    this.repeat=n;this.completed=0;this.notify();
  }
  async select(ayah,play=false){
    if(!this.enabled||!Number.isInteger(ayah)||ayah<this.start||ayah>this.end)return;
    const token=++this.version;this.wantsPlay=false;this.audio.pause();this.current=ayah;this.completed=0;this.post=null;this.status='loading';this.notify();
    try{
      const post=await this.load(`q-${this.surah}-${ayah}`);
      if(!this.enabled||token!==this.version)return;
      if(!post)throw new Error('Ayah unavailable');
      this.post=post;this.audio.src=recitationURL(post.number,this.preferences().reciter);this.audio.load();this.audio.playbackRate=Number(this.preferences().speed)||1;
      this.status='ready';this.notify();if(play)await this.play();
    }catch{if(this.enabled&&token===this.version){this.wantsPlay=false;this.status='error';this.notify();}}
  }
  async play(){
    if(!this.enabled)return;
    if(!this.post||this.post.ayah!==this.current||this.status==='error')return this.select(this.current,true);
    if(this.status==='finished'){this.completed=0;this.audio.currentTime=0;}
    const token=this.version;this.wantsPlay=true;this.status='loading';this.notify();
    try{await this.audio.play();if(!this.enabled||token!==this.version||!this.wantsPlay)return;this.status='playing';this.notify();}
    catch{if(this.enabled&&token===this.version&&this.wantsPlay){this.wantsPlay=false;this.status='error';this.notify();}}
  }
  pause(){this.version++;this.wantsPlay=false;this.audio.pause();this.status=this.post?'paused':'idle';this.notify();}
  toggle(){if(this.wantsPlay)this.pause();else this.play();}
  async advance(){
    this.completed++;
    if(this.repeat===Infinity||this.completed<this.repeat){this.audio.currentTime=0;return this.play();}
    if(this.current<this.end)return this.select(this.current+1,true);
    this.wantsPlay=false;this.status='finished';this.notify();
  }
  changeReciter(){const resume=this.wantsPlay;return this.select(this.current,resume);}
}
