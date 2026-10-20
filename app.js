'use strict';
const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const palettes = {warm:['#38251e','#aa6846','#ffd4a1'],luxury:['#071e20','#295a51','#c4edb0'],pink:['#352230','#8e546f','#ffd1e1']};
let background = null, sceneImages = [], raf = 0, busy = false, videoUrl = null;
let audioContext, audioBuffer = null, audioUrl = null, audioSource = null, audioTimings = null, audioKind = '', audioRequest = 0, imageRequest = 0;
const lines = () => $('script').value.split('\n').map(s => s.trim()).filter(Boolean);
const duration = () => Math.max(1, Math.min(600, Number($('duration').value) || 15));
const setStatus = text => { $('status').textContent = text; };
function lock(value) {
  busy = value;
  document.querySelectorAll('input,textarea,select,button').forEach(el => { el.disabled = value; });
}
function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error('Trình duyệt không hỗ trợ xử lý âm thanh. Hãy dùng Chrome hoặc Edge mới.');
  return audioContext ||= new AudioCtx();
}
function stopPlayback() {
  cancelAnimationFrame(raf);
  if (audioSource) { try { audioSource.stop(); } catch {} audioSource.disconnect(); audioSource = null; }
}
function clearAudio(message = 'Đã xóa âm thanh.') {
  stopPlayback(); audioRequest++;
  audioBuffer = null; audioTimings = null; audioKind = '';
  $('audio-preview').pause(); $('audio-preview').removeAttribute('src'); $('audio-preview').hidden = true;
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = null; $('audio-file').value = '';
  $('audio-download').hidden = $('clear-audio').hidden = true;
  $('audio-status').textContent = message;
}
async function loadAudio(blob, timings, kind, request) {
  const buffer = await getAudioContext().decodeAudioData(await blob.arrayBuffer());
  if (request !== audioRequest) return;
  if (buffer.duration > 600) throw new Error('Âm thanh tối đa 10 phút.');
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioBuffer = buffer; audioTimings = timings; audioKind = kind;
  audioUrl = URL.createObjectURL(blob); $('audio-preview').src = audioUrl; $('audio-preview').hidden = false;
  $('audio-download').href = audioUrl; $('audio-download').download = kind === 'upload' ? 'am-thanh-goc' : 'loi-doc.wav';
  $('audio-download').hidden = $('clear-audio').hidden = false;
  $('duration').value = buffer.duration.toFixed(1);
  $('audio-status').textContent = `Đã thêm ${buffer.duration.toFixed(1)} giây âm thanh. Âm thanh sẽ được nhúng khi xuất video.`;
  refresh();
}
function sceneAt(time) {
  const count = Math.max(1, lines().length);
  if (audioTimings && audioTimings.length === count) {
    let elapsed = 0;
    for (let i = 0; i < count; i++) {
      const length = audioTimings[i];
      if (time < elapsed + length || i === count - 1) return [i, Math.min(1, Math.max(0, (time - elapsed) / length))];
      elapsed += length;
    }
  }
  const position = Math.min(count - 0.00001, Math.max(0, time / duration() * count));
  return [Math.floor(position), position % 1];
}
function size() {
  const [a,b] = $('ratio').value.split(':').map(Number);
  canvas.width = a >= b ? 1280 : 720; canvas.height = Math.round(canvas.width * b / a);
  if (a === b) canvas.width = canvas.height = 720;
}
function wrap(text, maxWidth) {
  const out = []; let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && ctx.measureText(line + ' ' + word).width > maxWidth) { out.push(line); line = ''; }
    if (ctx.measureText(word).width > maxWidth) {
      for (const letter of word) {
        if (ctx.measureText(line + letter).width > maxWidth) { out.push(line); line = ''; }
        line += letter;
      }
    } else line += (line ? ' ' : '') + word;
  }
  if (line) out.push(line);
  return out;
}
function draw(time = 0) {
  const W = canvas.width, H = canvas.height, [i,p] = sceneAt(time), texts = lines();
  const colors = palettes[$('style').value], asset = sceneImages[i], image = asset?.image || background;
  const gradient = ctx.createLinearGradient(0,0,W,H); gradient.addColorStop(0,colors[0]); gradient.addColorStop(1,colors[1]);
  ctx.fillStyle = gradient; ctx.fillRect(0,0,W,H);
  if (image) {
    const z = $('motion').value === 'zoom' ? 1 + p * .06 : 1;
    // Contain documentary images so screenshots and source text are not cropped.
    const contain = !!asset?.contain;
    const box = contain ? {x:W*.08,y:H*.14,w:W*.84,h:H*.30} : {x:0,y:0,w:W,h:H};
    const scale = (contain ? Math.min(box.w/image.width,box.h/image.height) : Math.max(W/image.width,H/image.height)) * (contain ? 1 : z);
    let x = box.x + (box.w-image.width*scale)/2, y = box.y+(box.h-image.height*scale)/2;
    if (!contain && $('motion').value === 'pan') x += (p-.5)*W*.04;
    ctx.drawImage(image,x,y,image.width*scale,image.height*scale);
    if (!contain) {
      const shade = ctx.createLinearGradient(0,0,0,H); shade.addColorStop(0,'#0009'); shade.addColorStop(.35,'#0003'); shade.addColorStop(1,'#000e');
      ctx.fillStyle = shade; ctx.fillRect(0,0,W,H);
    }
  } else {
    ctx.fillStyle = colors[2]+'13'; ctx.beginPath(); ctx.arc(W*.8,H*.3,W*.6,0,7); ctx.fill();
    ctx.strokeStyle = colors[2]+'22'; ctx.lineWidth=2; ctx.strokeRect(W*.1,H*.18,W*.8,H*.56);
  }
  ctx.fillStyle=colors[2];ctx.textAlign='left';ctx.font=`600 ${Math.round(W*.027)}px system-ui`;
  ctx.fillText($('brand').value,W*.09,H*.08,W*.82);
  let fontSize=Math.round(Math.min(W*.065,H*.075)), rows;
  do {
    ctx.font=`750 ${fontSize}px system-ui`; rows=wrap(texts[i]||'Thêm nội dung để bắt đầu',W*.8);
    if(rows.length*fontSize*1.32<H*.31)break;
    fontSize-=2;
  }while(fontSize>16);
  ctx.fillStyle='#fffdf4'; ctx.globalAlpha=Math.min(1,.35+p*6);
  rows.forEach((text,j)=>ctx.fillText(text,W*.1,H*.77-(rows.length-1-j)*fontSize*1.32)); ctx.globalAlpha=1;
  ctx.fillStyle=colors[2];ctx.fillRect(W*.1,H*.82,W*.12,5);
  ctx.fillStyle='#ffffff55';ctx.fillRect(W*.1,H*.9,W*.8,3);
  ctx.fillStyle=colors[2];ctx.fillRect(W*.1,H*.9,W*.8*Math.min(1,time/duration()),3);
  if(asset?.credit){ctx.font=`400 ${Math.round(W*.021)}px system-ui`;ctx.fillStyle='#fffdf4';ctx.fillText(asset.credit,W*.1,H*.95,W*.8);}
  $('count').textContent=`CẢNH ${i+1} / ${Math.max(1,texts.length)}`;
}
function prompt() { return `${$('idea').value.trim()} Khung hình ${$('ratio').value}. Thời lượng ${duration()} giây. Chuyển động camera mượt mà, chi tiết rõ nét. Không thêm chữ hoặc logo ngoài ý muốn.`; }
function refresh(){if(busy)return;stopPlayback();size();draw();$('prompt').textContent=prompt();}
function loadImage(file) {
  return new Promise((resolve,reject)=>{
    if(file.size>20*1024*1024)return reject(new Error('Vui lòng chọn ảnh nhỏ hơn 20 MB.'));
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Không đọc được tệp ảnh.'));
    reader.onload=()=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Không đọc được ảnh. Hãy dùng JPG, PNG hoặc WebP.'));image.src=reader.result;};
    reader.readAsDataURL(file);
  });
}
function renderSceneInputs() {
  const parent=$('scene-images');parent.replaceChildren();
  lines().forEach((text,index)=>{
    sceneImages[index] ||= {image:null,credit:'',contain:true};
    const asset=sceneImages[index], row=document.createElement('div');row.className='scene-image-row';
    const title=document.createElement('div');title.className='small';title.textContent=`Cảnh ${index+1}: ${text.slice(0,85)}`;row.append(title);
    const label=document.createElement('label');label.textContent='Chọn ảnh cho cảnh này';
    const input=document.createElement('input');input.type='file';input.accept='image/*';label.append(input);row.append(label);
    const preview=document.createElement('img');preview.alt=`Ảnh cảnh ${index+1}`;preview.hidden=!asset.image;
    if(asset.image)preview.src=asset.image.src;row.append(preview);
    input.onchange=async()=>{if(!input.files[0])return;const request=(asset.request||0)+1;asset.request=request;try{const image=await loadImage(input.files[0]);if(sceneImages[index]!==asset||asset.request!==request)return;asset.image=image;preview.src=image.src;preview.hidden=false;refresh();}catch(e){setStatus(e.message);input.value='';}};
    const creditLabel=document.createElement('label');creditLabel.textContent='Nguồn / chú thích ảnh';
    const credit=document.createElement('input');credit.value=asset.credit;credit.maxLength=180;credit.placeholder='Ví dụ: Ảnh tự chụp hoặc tên nguồn';credit.oninput=()=>{asset.credit=credit.value;refresh();};creditLabel.append(credit);row.append(creditLabel);
    const fitLabel=document.createElement('label');fitLabel.textContent='Cách hiển thị';
    const fit=document.createElement('select');fit.innerHTML='<option value="contain">Hiện trọn ảnh / tài liệu</option><option value="cover">Phủ kín nền video</option>';fit.value=asset.contain?'contain':'cover';fit.onchange=()=>{asset.contain=fit.value==='contain';refresh();};fitLabel.append(fit);row.append(fitLabel);
    const clear=document.createElement('button');clear.className='secondary';clear.textContent='Xóa ảnh cảnh';clear.onclick=()=>{asset.request=(asset.request||0)+1;asset.image=null;preview.hidden=true;preview.removeAttribute('src');input.value='';refresh();};row.append(clear);parent.append(row);
  });
  sceneImages.length=lines().length;
}
$('photo').onchange=async e=>{const request=++imageRequest;if(!e.target.files[0]){background=null;return refresh();}try{const image=await loadImage(e.target.files[0]);if(request!==imageRequest)return;background=image;refresh();}catch(error){setStatus(error.message);}};
$('script').addEventListener('input',()=>{if(audioKind==='generated'||audioKind==='sample')clearAudio('Nội dung đã đổi. Hãy tạo lại lời đọc để khớp cảnh.');else audioTimings=null;renderSceneInputs();refresh();});
$('narration').addEventListener('input',()=>{if(audioKind==='generated'||audioKind==='sample')clearAudio('Lời đọc đã đổi. Hãy nhấn Tạo giọng đọc lại.');});
['brand','ratio','duration','style','motion','idea'].forEach(id=>$(id).addEventListener('input',()=>{if(id==='duration'&&audioBuffer){$('duration').value=audioBuffer.duration.toFixed(1);setStatus('Thời lượng đang khớp âm thanh. Xóa âm thanh để tự chỉnh.');}refresh();}));
$('audio-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>50*1024*1024){setStatus('Chọn âm thanh nhỏ hơn 50 MB.');return;}const request=++audioRequest;lock(true);stopPlayback();try{await loadAudio(file,null,'upload',request);setStatus('Đã thêm âm thanh.');}catch(error){setStatus('Không đọc được âm thanh: '+error.message);}finally{lock(false);refresh();}};
$('clear-audio').onclick=()=>{clearAudio();refresh();};
$('generate-voice').onclick=async()=>{
  const scenes=lines(), spoken=$('narration').value.trim()?$('narration').value.split('\n').map(s=>s.trim()).filter(Boolean):scenes;
  if(!scenes.length)return setStatus('Hãy nhập nội dung video trước.');
  if(spoken.length!==scenes.length)return setStatus(`Cần ${scenes.length} dòng lời đọc, mỗi dòng khớp một cảnh.`);
  if(spoken.join('').length>5000)return setStatus('Lời đọc tối đa 5.000 ký tự.');
  if(location.protocol==='file:')return setStatus('Để tạo giọng đọc, chạy ứng dụng bằng python server.py. Bạn vẫn có thể tải tệp âm thanh lên.');
  stopPlayback();lock(true);setStatus('Đang tạo giọng đọc…');const request=++audioRequest;
  try{
    const response=await fetch('api/narration',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenes:spoken,engine:$('voice').value})});
    if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Chức năng này cần máy chủ giọng đọc: chạy python server.py. Hoặc tải MP3/WAV lên.');
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Không tạo được giọng đọc.');
    const bytes=Uint8Array.from(atob(result.audio),c=>c.charCodeAt(0));
    await loadAudio(new Blob([bytes],{type:'audio/wav'}),result.durations,'generated',request);
    setStatus('Đã tạo lời đọc và khớp thời lượng từng cảnh.');
  }catch(error){setStatus(error.message);}finally{lock(false);refresh();}
};
function animate(done,clock){let start;function frame(now){if(start===undefined)start=now;const t=Math.min(clock?clock():(now-start)/1000,duration());draw(t);if(t<duration())raf=requestAnimationFrame(frame);else done?.();}raf=requestAnimationFrame(frame);}
function startAudio(destination){if(!audioBuffer)return null;const source=getAudioContext().createBufferSource();source.buffer=audioBuffer;source.connect(destination);source.start();audioSource=source;return source;}
$('play').onclick=async()=>{stopPlayback();$('audio-preview').pause();try{if(audioBuffer){const context=getAudioContext();await context.resume();const start=context.currentTime;startAudio(context.destination);animate(()=>stopPlayback(),()=>context.currentTime-start);}else animate();}catch(error){setStatus(error.message);}};
$('export').onclick=async()=>{
  if(!lines().length)return setStatus('Hãy nhập ít nhất một dòng nội dung.');
  if(!window.MediaRecorder||!canvas.captureStream)return setStatus('Hãy dùng Chrome hoặc Edge mới để xuất video.');
  stopPlayback();$('audio-preview').pause();lock(true);size();draw();$('download').hidden=true;
  let stream,destination,recorder,failed=false;
  const cleanup=()=>{stopPlayback();stream?.getTracks().forEach(track=>track.stop());destination?.disconnect();lock(false);};
  try{
    if(audioBuffer)await getAudioContext().resume();
    stream=canvas.captureStream(30);
    if(audioBuffer){destination=getAudioContext().createMediaStreamDestination();destination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));}
    const candidates=audioBuffer?['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']:['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
    const mime=candidates.find(type=>MediaRecorder.isTypeSupported(type));if(!mime)throw new Error('Trình duyệt chưa hỗ trợ WebM.');
    recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000,audioBitsPerSecond:128000});const chunks=[];
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>{failed=true;cleanup();setStatus('Xuất thất bại. Vui lòng thử lại.');};
    recorder.onstop=()=>{cleanup();if(failed||!chunks.length)return;if(videoUrl)URL.revokeObjectURL(videoUrl);videoUrl=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));$('download').href=videoUrl;$('download').download='minh-video-'+Date.now()+'.webm';$('download').hidden=false;setStatus(audioBuffer?'Video có âm thanh đã sẵn sàng. Nhấn Tải video để lưu.':'Video không âm thanh đã sẵn sàng. Nhấn Tải video để lưu.');};
    setStatus('Đang xuất video… Giữ trang ở phía trước đến khi hoàn tất.');
    recorder.start(1000);
    if(audioBuffer){const start=getAudioContext().currentTime;startAudio(destination);animate(()=>recorder.stop(),()=>getAudioContext().currentTime-start);}else animate(()=>recorder.stop());
  }catch(error){failed=true;if(recorder?.state==='recording')recorder.stop();cleanup();setStatus(error.message);}
};
const templates={car:['MINH AUTO','Một chi tiết nhỏ, nâng tầm không gian xe.\nThiết kế tinh tế trong từng góc nhìn.\nKhám phá phong cách của riêng bạn.','luxury'],case:['ỐP HỊN CUTE','Đổi chiếc ốp, đổi luôn phong cách!\nXinh từ màu sắc đến từng chi tiết.\nChọn mẫu bạn yêu thích tại Ốp Hịn Cute.','pink'],food:['BẾP CỦA MINH','Hôm nay, vào bếp cùng Minh nhé!\nMột chút chăm chút, thêm trọn vị ngon.\nLưu lại để cùng làm vào cuối tuần.','warm'],registration:['ĐĂNG KÝ XE TRỰC TUYẾN','Đăng ký xe lần đầu: 5 bước trực tuyến.\nBước 1: Chuẩn bị VNeID mức độ 2 và dữ liệu điện tử của xe.\nBước 2: Kê khai hồ sơ trên cổng dịch vụ công hoặc VNeID.\nBước 3: Làm theo hướng dẫn bấm biển khi hồ sơ hợp lệ.\nBước 4: Thanh toán lệ phí và lưu biên lai điện tử.\nBước 5: Chọn nhận biển số và giấy đăng ký tại cơ quan hoặc qua bưu chính.\nGiữ bản chính giấy tờ cần bàn giao theo hướng dẫn.\nLưu mã hồ sơ, theo dõi thông báo và đối chiếu quy định hiện hành.','luxury']};
document.querySelectorAll('[data-template]').forEach(button=>button.onclick=async()=>{
  clearAudio('Hãy tạo giọng đọc cho mẫu mới.');background=null;imageRequest++;sceneImages=[];$('photo').value='';
  const template=templates[button.dataset.template];$('brand').value=template[0];$('script').value=template[1];$('style').value=template[2];$('narration').value='';renderSceneInputs();refresh();
  if(button.dataset.template==='registration'){
    lock(true);const request=++audioRequest;setStatus('Đang nạp mẫu đăng ký xe có lời đọc…');
    try{
      const response=await fetch('assets/registration.json');if(!response.ok)throw new Error('Không tải được mẫu lời đọc.');
      const data=await response.json();const audio=await fetch(data.audio);if(!audio.ok)throw new Error('Không tải được âm thanh mẫu.');
      await loadAudio(await audio.blob(),data.durations,'sample',request);$('narration').value=data.narration.join('\n');setStatus('Đã nạp mẫu đăng ký xe có giọng đọc. Bạn có thể thêm ảnh cho từng cảnh.');
    }catch(error){setStatus('Mẫu chữ đã sẵn sàng. Để nạp giọng mẫu, mở ứng dụng qua máy chủ hoặc tải tệp âm thanh lên.');}
    finally{lock(false);refresh();}
  }
});
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(prompt());setStatus('Đã sao chép câu lệnh AI.');}catch{setStatus('Hãy chọn và sao chép phần câu lệnh bên dưới.');}};
renderSceneInputs();refresh();
