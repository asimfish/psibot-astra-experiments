'use strict';
const reportBase = new URL('.', document.currentScript.src);
const mediaUrl = path => new URL(path, reportBase).href;
const $ = s => document.querySelector(s);
const escape = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sec = v => typeof v === 'number' && Number.isFinite(v) ? `${v.toFixed(1)} s` : '未测';
const scoreLabel = c => c.registered_metric==='final_one_second_stable_hold' ? (c.physical_success?'末1秒稳定抓持评分通过':'末1秒稳定抓持评分未通过') : (c.physical_success?'已注册物理评分通过':'已注册物理评分失败');
const val = v => v === null || v === undefined ? '未测' : String(v);
let data;
let playbackDeliveries=[];
function playbackFor(trial,video){
 const d=playbackDeliveries.find(x=>x.trial_id===trial.trial_id&&x.camera===video.camera&&x.original_src===video.src&&x.original_sha256===video.sha256);
 return d&&d.method==='stream_copy_faststart'&&d.reencoded===false&&d.every_packet_payload_PTS_DTS_duration_flags_identical===true&&/^[0-9a-f]{64}$/.test(d.playback_sha256)&&['media/', '../frontier-98/media/', '../frontier-99/media/', '../frontier-100/media/', '../frontier-101/media/', '../frontier-104/media/', '../frontier-106/media/', '../frontier-108/media/', '../frontier-110/media/'].some(prefix=>d.playback_src===`${prefix}playback-${d.playback_sha256}.mp4`)?d:null;
}
function visualText(v){return Object.entries(v).map(([k,x])=>`<p><strong>${escape(k)}</strong>：${escape(typeof x==='object'?JSON.stringify(x):x)}</p>`).join('');}
function cameraCard(c,image,video,trial){
 const delivery=playbackFor(trial,video),playSrc=delivery?delivery.playback_src:video.src;
 const g=image.geometry,angle=typeof g.pitch_down_deg==='number'?`向下倾角 ${g.pitch_down_deg.toFixed(1)}°，世界方位 ${g.yaw_world_deg.toFixed(1)}°`:'角度证据缺失';
 return `<article class="camera" data-camera="${escape(c)}"><h4>${escape(c)} · ${escape(image.dimensions.join('×'))} 实际输入</h4><p class="muted">${angle}（${g.source==='actual_visible_K'?'该轮给 Astra 的 K':g.source==='not_in_model_K'?'该条件移除K，未额外取渲染外参':'渲染证据，不是该轮给 Astra 的世界外参'}）${g.calibration_scope==='intrinsics_only'?'；该相机输入 K 仅有内参，世界角度未提供':''}</p>${trial.task==='psi_grasp'&&c==='wrist_camera'?'<p class="muted camera-limitation">原帧视检：此腕部机位经常未包含目标瓶体，不能据它独立判断抓持；有输入不等于目标可见。</p>':''}<div class="media-pair"><figure><img loading="lazy" src="${mediaUrl(image.actual_input)}" width="${image.dimensions[0]}" height="${image.dimensions[1]}" alt="${escape(c)} 第0轮实际提交输入"><figcaption>第0轮实际提交 PNG · ${image.dimensions.join('×')}</figcaption>${image.final_actual_input?`<img loading="lazy" src="${mediaUrl(image.final_actual_input)}" width="${(image.final_dimensions||image.dimensions)[0]}" height="${(image.final_dimensions||image.dimensions)[1]}" alt="${escape(c)} 第${image.final_decision}轮实际提交输入"><figcaption>第${image.final_decision}轮实际提交 PNG · ${(image.final_dimensions||image.dimensions).join("×")}；同一episode末轮输入</figcaption>`:''}</figure><figure><video controls playsinline preload="none" poster="${mediaUrl(image.actual_input)}" data-original-src="${mediaUrl(video.src)}" data-delivery="${delivery?'stream-copy-faststart':'original'}" src="${mediaUrl(playSrc)}"></video><figcaption>${delivery?'在线播放版 · 索引前移，逐包及时间戳一致；未重编码。原视频下载见下方':'同 episode 原 MP4，未重编码'} · ${video.metadata.width}×${video.metadata.height} · 1× 仿真时间</figcaption></figure></div><div class="image-links"><a href="${mediaUrl(image.actual_input)}" download>下载实际输入</a> · <a href="${mediaUrl(image.original_observation)}" download>下载原尺寸观察 ${image.original_dimensions.join('×')}</a>${image.final_original_observation?` · <a href="${mediaUrl(image.final_original_observation)}" download>下载末轮原尺寸观察 ${image.final_original_dimensions.join('×')}</a>`:''} · <a href="${mediaUrl(video.src)}" download>下载完整原视频</a></div></article>`;
}
function registeredScope(c){
 if(c.registered_metric==='two_phase_A_B_withdraw_with_geometric_safety')return `<p class="metric-scope"><strong>完整两阶段与几何安全评分：</strong>${c.completed_phases}/2 阶段；最大倾角 ${c.max_tilt_deg_entire_episode.toFixed(3)}°。评分同时核验位置、支撑、稳定保持与手撤离；单次结果不解释输入因果。</p>`;
 if(c.registered_metric==='four_phase_A_B_withdraw_A_with_geometric_safety'||c.task==='psi_roundtrip_100ml'){
  const tilt=c.max_tilt_deg_entire_episode,hasTilt=typeof tilt==='number'&&Number.isFinite(tilt);
  const completed=c.physical_success===true&&c.completed_phases===4;
  const tiltStop=hasTilt&&tilt>15&&c.stop_reason==='geometric_hard_abort';
  return `<p class="metric-scope"><strong>完整四阶段与几何安全评分：</strong>${c.completed_phases}/4 阶段；最大倾角 ${hasTilt?tilt.toFixed(3)+'°':'未单独记录'}。${tiltStop?'实际倾角超过 15°，已按几何安全门停止。':''}${completed?'本条完整往返评分通过。':'本条完整往返未完成。'}</p>${c.phase_times_s&&Object.keys(c.phase_times_s).length?`<p class="phase-timeline"><strong>原四阶段完成时刻（仿真秒，不是墙钟）：</strong>${Object.entries(c.phase_times_s).map(([k,v])=>escape(({lift_from_A:'A点抓起',released_and_withdrawn_at_B:'B点释放并撤手',regrasp_and_lift_from_B:'B点再次抓起',returned_released_and_withdrawn_at_A:'返回A点释放并撤手'})[k]||k)+' '+v.toFixed(3)+' s').join(' → ')}</p>`:''}`;
 }
 if(c.registered_metric!=='final_one_second_stable_hold')return '';
 const whole=c.continuously_upright_at_most_15deg;
 return `<aside class="metric-scope ${whole===false?'metric-warning':''}"><strong>评分与指令分别记录：</strong>末1秒稳定抓持 ${c.physical_success?'通过':'未通过'}；全程倾角 ≤15° ${whole===true?'通过':whole===false?'未通过':'未单独核验'}。全程最大倾角 ${c.max_tilt_deg_entire_episode.toFixed(2)}°，末1秒最大 ${c.final_hold_max_tilt_deg.toFixed(2)}°。${whole===false?'本次发生翻倒与重抓，最后恢复直立不能写成全程保持直立；不能在 n<20 时归因于删除 C。':'最终评分不等同于仅凭单张图证明完整1秒稳定。'}</aside>`;
}
function eventFrames(c){return c.original_event_frames?`<div class="event-gallery"><h4>同一 episode 的已视检原帧</h4><div>${c.original_event_frames.map(i=>`<figure><img loading="lazy" src="${mediaUrl(i.src)}" width="640" height="480" alt="${escape(i.label)}"><figcaption>${escape(i.label)} · ${i.camera} · 帧 ${i.frame_index} / 仿真 ${i.simulation_time_s.toFixed(2)} s</figcaption><a href="${mediaUrl(i.src)}" download>下载原帧</a></figure>`).join('')}</div><p class="muted">稀疏原帧用于展示已核视觉事实，不是重新评分；完整原视频见下方对应相机。</p></div>`:'';}

function timingNote(c){
 if(c.derived_variant&&!(typeof c.timing.episode_wall_s==='number'&&Number.isFinite(c.timing.episode_wall_s)))return '<p class="metric-scope timing-censored">有效物理失败已接受；原 episode 墙钟、控制/渲染墙钟及起止时间未保存。模型等待和编码时间单列，不能相加补造总墙钟，也不是成功耗时。</p>';
 return c.time_to_success_censored?'<p class="metric-scope timing-censored">本条在失败时早停；已记录的墙钟是到失败停止的耗时，成功完成耗时未观测，不能作为提速证据。</p>':'';
}
function derivedProvenance(c){
 if(!c.derived_variant)return `物理终态 SHA：<code>${escape(c.native_terminal_sha256)}</code>`;
 return `独立派生科学审定 SHA：<code>${escape(c.derived_scientific_acceptance_sha256)}</code><br>原锁追加凭据 SHA：<code>${escape(c.actual_atomic_append_sha256)}</code><br>原 NATIVE_TERMINAL 缺失，未补造；原 ${escape(c.original_error_type)} / ${escape(c.original_error_phase)} 与控制关闭历史保留。<br><span class="muted">${escape(c.original_error_scope)}。本条按同一次保存记录、签名交互、原始评价器与独立视检审定；不是重新运行。</span>`;
}
function derivedMedia(c){
 const cards=c.original_videos.map(v=>{
  const input=c.input_images.find(i=>i.camera===v.camera);
  if(input)return cameraCard(input.camera,input,v,c);
  const delivery=playbackFor(c,v),playSrc=delivery?delivery.playback_src:v.src;
  return `<article class="camera result-video-only" data-result-camera="${escape(v.camera)}"><h4>${escape(v.camera)} · 同 episode 结果视频</h4><p class="muted">该相机 RGB 未作为当前或历史输入提供给 Astra；K 相机条目另按真实输入记录。</p><video controls playsinline preload="none" data-original-src="${mediaUrl(v.src)}" data-delivery="${delivery?'stream-copy-faststart':'original'}" src="${mediaUrl(playSrc)}"></video><p>${v.metadata.width}×${v.metadata.height} · ${v.metadata.decoded_frames}帧 · ${v.metadata.fps} Hz 仿真；原视频未重编码。</p><a href="${mediaUrl(v.src)}" download>下载完整原视频</a></article>`;
 }).join('');
 return `<section class="derived-evidence"><p class="metric-scope"><strong>同一次原始交互：</strong>左侧两相机列含第0/36轮实际输入及对应完整结果视频；第三视角只作结果观察。6张中间原帧在下方，均不是额外模型输入。</p><div class="derived-camera-grid">${cards}</div>${eventFrames(c)}</section>`;
}

function caseBodyWithoutEnv(c){
 const cover=Object.entries(c.input_channel_coverage).map(([k,v])=>`<tr><td>${k}</td><td>${v.enabled?'保留':'主动删减'}</td><td>${escape(v.first_decision==='initial_no_previous_action'?'首轮无前序动作 / 历史':v.first_decision==='removed_by_condition'?'条件移除':v.first_decision==='populated'?'有值':v.first_decision)}</td><td>${v.nonnull_decisions} / ${c.actual_completed_model_replies}</td></tr>`).join('');
 const omitted=c.original_videos.filter(v=>!v.shown_to_model);
 const absent=omitted.length?`<details class="result-videos-only"><summary>仅结果视频（未提供模型）：${omitted.map(v=>v.camera).join(', ')}</summary>${omitted.map(v=>{const delivery=playbackFor(c,v),playSrc=delivery?delivery.playback_src:v.src;return `<article class="result-video-only" data-result-camera="${escape(v.camera)}"><h4>${escape(v.camera)} · 仅结果观察，未提供给 Astra</h4><video controls playsinline preload="none" data-original-src="${mediaUrl(v.src)}" data-delivery="${delivery?'stream-copy-faststart':'original'}" src="${mediaUrl(playSrc)}"></video><p class="muted">仅用于核对同一 episode 的物理结果；不是当前或历史 RGB 输入，不增加输入相机数。</p><p><a href="${mediaUrl(v.src)}" download>下载完整原视频</a> · ${v.metadata.width}×${v.metadata.height} · ${v.metadata.fps} Hz 仿真${delivery?' · 在线播放版为逐包一致的索引前移副本，未重编码':''}</p></article>`;}).join('')}</details>`:'';
 return `${c.input_condition_scope?`<p class="metric-scope input-condition-scope">${escape(c.input_condition_scope)}</p>`:""}${registeredScope(c)}${timingNote(c)}<div class="metric-grid"><div><b class="${c.physical_success?'good':'bad'}">${scoreLabel(c)}${c.completed_phases===null?'':` · ${c.completed_phases} 阶段`}</b><span>${escape(c.stop_reason)}</span></div><div><b>${c.actual_completed_model_replies} 次</b><span>实际完成的模型回复</span></div><div><b>${val(c.pickup_attempts)} / ${val(c.pickup_retries)}</b><span>物理抓取尝试 / 抓取重试</span></div><div><b>${sec(c.timing.episode_wall_s)}</b><span>交互墙钟，含模型等待</span></div><div><b>${sec(c.timing.model_wait_s)}</b><span>模型等待，是墙钟子项</span></div><div><b>${sec(c.timing.simulation_time_s)}</b><span>仿真任务时间</span></div></div><p class="muted">释放重新接触恢复：${(c.placement_recontact_metric_applicable??c.placement_metric_applicable)?val(c.placement_recontact_recoveries):c.placement_recontact_metric_scope?'未单独测量（不影响放置评分）':'未适用 / 此条未测'}；任务重启：${val(c.task_retries)}。网络重试：${val(c.network_retries)}。这些数不与模型回复数互换。</p><p><strong>${c.camera_count} 个当前输入相机：</strong>${c.current_camera_names.join(', ')}。<strong>K 的相机条目：</strong>${c.K_camera_names.length?c.K_camera_names.join(', '):'K 主动删减 / 无条目'}。</p><div class="table-scroll"><table class="coverage"><thead><tr><th>通道</th><th>条件</th><th>第0轮</th><th>有值轮次</th></tr></thead><tbody>${cover}</tbody></table></div><p class="muted">H/M/F/C 后续可能产生信息；上表按实际每轮输入计数，空值不是自动判为删减。当前 + 历史图像总数范围 ${Math.min(...c.model_steps.map(x=>x.image_count_including_history))}–${Math.max(...c.model_steps.map(x=>x.image_count_including_history))}。</p>${c.derived_variant?derivedMedia(c):eventFrames(c)+c.input_images.map(i=>cameraCard(i.camera,i,c.original_videos.find(v=>v.camera===i.camera),c)).join('')+absent}<details class="seed-notes"><summary>该次已接受的原帧视检与限制</summary>${visualText(c.visual_review)}</details><details class="seed-evidence"><summary>该次来源绑定与逐轮输入</summary><p>${escape(c.trial_id)} · experiment_kind=${c.experiment_kind} · offset_source=null</p><p>配对初态 SHA：<code>${c.paired_initial_sha256}</code><br>${derivedProvenance(c)}<br>视检记录 SHA：<code>${c.visual_review_sha256}</code></p><p>实际手势：${escape(c.hand_policy.actual_gesture_counts===null?'原签名核验：全部使用冻结手势库与有限微调；本快照未汇总次数':JSON.stringify(c.hand_policy.actual_gesture_counts))} · ${escape(c.hand_policy.mode)}；没有自由手关节输出。</p><p>控制/渲染 ${sec(c.timing.control_render_wall_s)}；编码 ${sec(c.timing.render_encode_wall_s)}（有重叠，不加和）。</p><table class="coverage"><thead><tr><th>轮次</th><th>当前相机</th><th>含历史图像数</th><th>输入尺寸</th></tr></thead><tbody>${c.model_steps.map(s=>`<tr><td>${s.decision}</td><td>${s.current_camera_names.join(', ')}</td><td>${s.image_count_including_history}</td><td>${s.current_dimensions.join('×')}</td></tr>`).join('')}</tbody></table></details>`;
}
function envLabel(c){const e=data.execution_environments[c.trial_id];return `${e.hostname} · admission ${e.admission_gpu_uuid.slice(0,12)}… · CUDA ${e.cuda_uuid?e.cuda_uuid.slice(0,12)+'…':'未记录'} · renderer ${val(e.renderer_index)} · ${e.runtime_package.join(',')} · freeze ${e.source_freeze_sha256.slice(0,12)}…`;}
function caseBody(c){const e=data.execution_environments[c.trial_id];return `<p class="muted"><strong>实际执行环境：</strong>${escape(envLabel(c))}。来源：${e.source==='actual_native_ADMISSION.resource'?'原 ADMISSION 准入快照':e.source==='actual_qualified_physical_phase_mapping'?'实际资格绑定的逻辑→物理映射与该包冻结':e.source==='actual_accepted_local4090_runtime_stratum'?'本条已接受原件的 local4090 runtime stratum 与原冻结':e.source==='actual_accepted_current_PRO6000_runtime_stratum'?'本条已接受原件的当前PRO6000 runtime stratum 与原冻结':'原 SOURCE_IDENTITY 初始快照'}；runtime build/session 未记录。GPU 完整 admission UUID：${escape(e.admission_gpu_uuid)}；CUDA UUID：${escape(e.cuda_uuid||'未记录')}。历史硬件/版本不同，不能把墙钟差异直接归因于输入。</p>`+caseBodyWithoutEnv(c);}
function statLabel(s,group,success){
 const outcomes=group.trial_ids.map(id=>data.cases.find(c=>c.trial_id===id)).filter(c=>c&&c.physical_success===success);
 const cases=outcomes.filter(c=>typeof c.timing.episode_wall_s==='number'&&Number.isFinite(c.timing.episode_wall_s));
 const missing=outcomes.length-cases.length;
 const waits=outcomes.map(c=>c.timing.model_wait_s).filter(x=>typeof x==='number'&&Number.isFinite(x)).sort((a,b)=>a-b);
 const mid=waits.length?(waits[Math.floor((waits.length-1)/2)]+waits[Math.floor(waits.length/2)])/2:null;
 const environments=new Set(cases.map(c=>{const e=data.execution_environments[c.trial_id];return JSON.stringify([e.hostname,e.admission_gpu_uuid,e.cuda_uuid,e.renderer_index,e.runtime_package,e.source_freeze_sha256]);}));
 const counts=`有效${success?'成功':'失败'} ${outcomes.length} 条；有墙钟 ${cases.length} 条；缺墙钟 ${missing} 条`;
 if(!outcomes.length)return `暂无已接受的${success?'成功':'失败'}样本`;
 if(!cases.length)return `${counts}<br>墙钟未记录；不按0秒统计。<br><span class="muted">模型等待单独观测：中位 ${sec(mid)}（${waits.length} 条）；不补算总墙钟。</span>`;
 return `${counts}<br>墙钟中位 ${sec(s.median_s)}<br><span class="muted">${sec(s.min_s)}–${sec(s.max_s)}</span><br><span class="muted">模型等待独立统计：中位 ${sec(mid)}（${waits.length} 条；与墙钟可用样本数不同）</span><p class="muted timing-environment-count" data-trials="${cases.map(c=>c.trial_id).join(',')}" data-outcome="${success?'success':'failure'}">有墙钟样本环境 ${environments.size} 种；详见 seed 耗时旁</p>`;
}
function inputSummary(group,seeds){
 if(seeds.length){const configs=[...new Set(seeds.map(c=>`${c.camera_count} 相机：${c.current_camera_names.join(', ')} · ${c.input_images[0].dimensions.join('×')}`))];return `已接受样本实际输入：${configs.map(escape).join('<br>')}`;}
 const baseline=data.cases.find(c=>c.task===group.task&&c.condition==='rich')||data.cases.filter(c=>c.task===group.task).sort((a,b)=>b.camera_count-a.camera_count)[0];
 const omitted=group.condition.match(/^minus_(head|chest|third|wrist)$/);
 const names=baseline.current_camera_names.filter(c=>!omitted||c!==omitted[1]+'_camera');
 const dimensions=group.condition==='rgb_half_resolution'?'320×240':'640×480';
 return `计划输入（协议，尚无本组样本）：${names.length} 相机：${names.map(escape).join(', ')} · ${dimensions}`;
}
function trialCounts(cases){
 if(!cases.length)return '';
 const range=key=>{const xs=cases.map(c=>c[key]).filter(x=>typeof x==='number');return xs.length?`${Math.min(...xs)}–${Math.max(...xs)}（已测 ${xs.length} 条）`:'未测';};
 return `<p class="muted trial-count-summary">物理抓取重试 ${range('pickup_retries')}<br>完成模型回复 ${range('actual_completed_model_replies')}</p>`;
}

function readerContext(c){
 const task=data.tasks[c.task].name,condition=data.cohorts.find(g=>g.task===c.task&&g.condition===c.condition).label;
 return `<strong>${escape(task)} · ${escape(condition)} · seed ${c.seed}</strong><span class="reader-context-score ${c.physical_success?'good':'bad'}">${scoreLabel(c)}${c.continuously_upright_at_most_15deg===false?'；全程直立未通过':''}</span><span class="reader-context-metrics">物理抓取重试 ${val(c.pickup_retries)} · 模型回复 ${c.actual_completed_model_replies} · 墙钟 ${sec(c.timing.episode_wall_s)}（含模型等待 ${sec(c.timing.model_wait_s)}）</span>`;
}
let readerContextScheduled=false;
function updateReaderContext(){
 readerContextScheduled=false;
 const bar=$('#reader-context');
 const active=Array.from(document.querySelectorAll('details.seed[open][data-rendered="true"]')).find(d=>{const r=d.getBoundingClientRect();return r.top<0&&r.bottom>110;});
 if(!active){bar.hidden=true;bar.dataset.trial='';return;}
 if(bar.dataset.trial!==active.dataset.trial){const c=data.cases.find(c=>c.trial_id===active.dataset.trial);bar.innerHTML=readerContext(c);bar.dataset.trial=c.trial_id;bar.dataset.condition=c.condition;}
 bar.hidden=false;
}
function scheduleReaderContext(){if(!readerContextScheduled){readerContextScheduled=true;requestAnimationFrame(updateReaderContext);}}
window.addEventListener('scroll',scheduleReaderContext,{passive:true});
window.addEventListener('resize',scheduleReaderContext,{passive:true});

function render(){
 $('#reader-context').hidden=true;$('#reader-context').dataset.trial='';
 const task=$('#task').value,condition=$('#condition').value;
 $('#task-description').textContent=`${data.tasks[task].robot} · ${data.tasks[task].goal}`;
 const cohorts=data.cohorts.filter(c=>c.task===task&&(condition==='all'||c.condition===condition));
 $('#matrix tbody').innerHTML=cohorts.map(group=>{
  const contrast=data.paired_contrasts.find(x=>x.task===task&&x.condition===group.condition);
  const seeds=group.trial_ids.map(id=>data.cases.find(c=>c.trial_id===id)).sort((a,b)=>a.seed-b.seed);
  return `<tr data-condition="${group.condition}"><td><strong>${escape(group.label)}</strong><div class="condition-id">${group.condition}</div><p class="muted">${escape(group.changed.length?group.changed.join(', ')+' 改变':'完整通道基线；首轮无历史正常为空')}</p><p class="muted input-summary">${inputSummary(group,seeds)}</p></td><td><div class="n-count">注册评分通过 ${group.success_n} / 接受 ${group.accepted_n}</div>${trialCounts(seeds)}<div class="missing">n=${group.accepted_n}/20，待补 ${group.missing_n}<br>${contrast?`配对 ${contrast.paired_n}/20`:'rich 配对基线'}<br>不推断成功率 / 输入效果</div></td><td>成功：${statLabel(group.success_wall,group,true)}<hr>失败：${statLabel(group.failure_wall,group,false)}<p class="muted">描述统计；失败早停不代表提速</p></td><td>${seeds.length?`同组 ${seeds.length} 条已接受试验：下行按 seed 展开输入、同次视频和结果。`:"尚无有效样本；不把未运行计作失败。"}</td></tr>${seeds.length?`<tr class="episode-row"><td colspan="4"><p class="episode-group-context"><strong>${escape(data.tasks[task].name)} · ${escape(group.label)}</strong> · ${seeds.length} 条原始 episode；条件与计数见上行。</p>${seeds.map(c=>`<details class="seed" data-trial="${c.trial_id}"><summary>seed ${c.seed} · <span class="${c.physical_success?'good':'bad'}">${scoreLabel(c)}</span> · ${c.camera_count} 相机 · ${c.actual_completed_model_replies} 模型回复 · 展开图像与视频</summary><div class="seed-body" data-id="${c.trial_id}"></div></details>`).join('')}</td></tr>`:""}`;
 }).join('');
 for(const el of document.querySelectorAll('details.seed'))el.addEventListener('toggle',()=>{if(el.open&&!el.dataset.rendered){el.querySelector('.seed-body').innerHTML=caseBody(data.cases.find(c=>c.trial_id===el.dataset.trial));el.dataset.rendered='true';}scheduleReaderContext();});
 window.astraReportTask=task;window.astraReportVisibleCohorts=cohorts.length;
}
(async()=>{
 data=await(await fetch(new URL('data.json', reportBase))).json();window.astraReportData=data;
 const [environments,deliveryManifest]=await Promise.all([
  fetch(new URL('environment_v2.json',reportBase)).then(r=>r.json()),
  fetch(new URL('delivery_manifest.json',reportBase)).then(r=>r.ok?r.json():null).catch(()=>null)
 ]);
 if(deliveryManifest?.schema==='astra.frontier112.web_playback_delivery.v1'&&Array.isArray(deliveryManifest.entries)&&deliveryManifest.entries.length===27)playbackDeliveries=deliveryManifest.entries;
 window.astraPlaybackDelivery=deliveryManifest;data.execution_environments=environments.environments;window.astraReportEnvironment=environments;
 $('#task').innerHTML=Object.entries(data.tasks).map(([id,t])=>`<option value="${id}">${escape(t.name)}</option>`).join('');
 const seen=new Set();for(const c of data.cohorts)if(!seen.has(c.condition)){seen.add(c.condition);$('#condition').insertAdjacentHTML('beforeend',`<option value="${c.condition}">${escape(c.label)}</option>`);}
 $('#task').addEventListener('change',render);$('#condition').addEventListener('change',render);$('#collapse').addEventListener('click',()=>document.querySelectorAll('details.seed').forEach(d=>{d.open=false;d.querySelectorAll('video').forEach(v=>v.pause());}));
 $('#channels tbody').innerHTML=Object.entries(data.channel_definitions).map(([k,v])=>`<tr><td><strong>${k}</strong></td><td>${escape(v)}</td></tr>`).join('');
 for(const [id,key] of [['camera-scope','camera_scope'],['hand-scope','hand_scope'],['retry-scope','retry_scope'],['timing-scope','timing_scope']])$('#'+id).textContent=data[key];
 $('#frontier-sha').textContent=data.frontier_sha256;
 const infra=data.infrastructure_censoring;$('#infra-scope').textContent=infra.scope;
 $('#infra-cost tbody').innerHTML=infra.rows.map(r=>`<tr data-infra-version="${r.version}"><td><strong>PsiBot</strong><br>${escape(r.trial_id)}<br>不计有效物理分母</td><td>${escape(r.exact_saved_failure_class)} / ${escape(r.exact_saved_error_type)}<br>HTTP ${r.http_status}；无 response.completed<br>未完成流 ${sec(r.incomplete_stream_s)}</td><td>已记请求 ${r.whole_episode_requests_charged} 次<br>单次失败请求上游尝试 ${r.failed_request_upstream_attempts}<br>episode墙钟 ${sec(r.episode_wall_s)}<br>model_wait ${sec(r.model_wait_s)}</td><td>中断前抓取尝试 ${r.pickup_attempts} / 重试 ${r.pickup_retries}<br>按删失保留，非完整任务重试数<br>非有效物理结果；原因未知；无退款</td></tr>`).join('');
 $('#exclusions-scope').textContent=data.exclusions_scope;
 const cutoff=data.execution_cutoff;$('#execution-cutoff').textContent=`固定核收截止 ${cutoff.as_of_utc}。${cutoff.scope} v84有3条、v85有8条、v91有${data.unattempted_excluded_v91.count}条、v97有${data.unattempted_excluded_v97.count}条未尝试尾项；均不记物理失败。`;
 $('#exclusions').innerHTML=data.exclusions.map(x=>`<div class="excluded-card"><strong>${escape(x.trial_id||x.kind)}</strong><p>${escape(x.kind==='offset_library_reuse'?'偏移库资格测试：Local4090 3 条，GPU1 3 条；各含1条原位与2条位置扰动。当前已独立接受的数据集：Local4090 30条、PRO6000 GPU1 68条，共98/98条。缓存复用零 Astra 调用，不进入输入消融分母。':x.reason||'独立记录，不计输入消融。')}</p><p>不计入有效 ${data.accepted_trials} 条或评分通过 / 已接受分母。${typeof x.completed_actual_model_replies==='number'?`实际完成回复 ${x.completed_actual_model_replies} 次；${typeof x.failed_signed_responses==='number'?`签名失败响应 ${x.failed_signed_responses} 次；`:''}中断不当作相机条件的物理失败，不推断后端原因。`:''}</p></div>`).join('');
 const cached=data.cached_collection.representative_episode;
 $('#cached-example-body').innerHTML=`<p>已核收 ${data.cached_collection.accepted_n}/${data.cached_collection.planned_postqualification_n} 条，待补 ${data.cached_collection.remaining_n}；正式消融分母新增 0。代表 seed ${cached.seed}：完整阶段 ${cached.completed_phases}/4，抓取尝试/重试 ${cached.pickup_attempts}/${cached.pickup_retries}；任务重启 ${val(cached.task_retries)}；交互墙钟 ${sec(cached.episode_wall_s)}，仿真任务 ${sec(cached.simulation_time_s)}，新增Astra调用 0。</p><article class="camera"><h4>${cached.camera} · 偏移复用的同次采集原件</h4><div class="media-pair"><figure><img loading="lazy" src="${mediaUrl(cached.original_frame)}" width="640" height="480" alt="seed21072结果原视频首帧"><figcaption>已核结果原视频第0帧；没有提交给Astra。</figcaption></figure><figure><video controls preload="none" width="640" height="480" src="${mediaUrl(cached.source_video)}"></video><figcaption>同seed完整原视频 · ${cached.fps} Hz仿真，${cached.decoded_frames}帧；原完整解码核收沿用。</figcaption></figure></div><p class="muted">${escape(cached.scope)} 核收截止 ${escape(data.cached_collection.as_of_utc)}。抓取偏移来自先前冻结库；此批按位置扰动跟踪，不是重新调用Astra，也不用于输入缺失效果推断。</p></article>`;
 const query=new URLSearchParams(location.search);if(data.tasks[query.get('task')])$('#task').value=query.get('task');if([...$('#condition').options].some(o=>o.value===query.get('condition')))$('#condition').value=query.get('condition');
 render();window.astraReportReady=true;
})().catch(e=>{$('#task-description').textContent='报告数据加载失败：'+e.message;throw e;});
