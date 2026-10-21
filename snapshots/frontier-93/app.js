'use strict';
const reportBase = new URL('.', document.currentScript.src);
const mediaUrl = path => new URL(path, reportBase).href;
const $ = s => document.querySelector(s);
const escape = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sec = v => typeof v === 'number' ? `${v.toFixed(1)} s` : '未测';
const scoreLabel = c => c.registered_metric==='final_one_second_stable_hold' ? (c.physical_success?'末1秒稳定抓持评分通过':'末1秒稳定抓持评分未通过') : (c.physical_success?'已注册物理评分通过':'已注册物理评分失败');
const val = v => v === null || v === undefined ? '未测' : String(v);
let data;
function visualText(v){return Object.entries(v).map(([k,x])=>`<p><strong>${escape(k)}</strong>：${escape(typeof x==='object'?JSON.stringify(x):x)}</p>`).join('');}
function cameraCard(c,image,video,trial){
 const g=image.geometry,angle=typeof g.pitch_down_deg==='number'?`向下倾角 ${g.pitch_down_deg.toFixed(1)}°，世界方位 ${g.yaw_world_deg.toFixed(1)}°`:'角度证据缺失';
 return `<article class="camera" data-camera="${escape(c)}"><h4>${escape(c)} · ${escape(image.dimensions.join('×'))} 实际输入</h4><p class="muted">${angle}（${g.source==='actual_visible_K'?'该轮给 Astra 的 K':g.source==='not_in_model_K'?'该条件移除K，未额外取渲染外参':'渲染证据，不是该轮给 Astra 的世界外参'}）${g.calibration_scope==='intrinsics_only'?'；该相机输入 K 仅有内参，世界角度未提供':''}</p>${trial.task==='psi_grasp'&&c==='wrist_camera'?'<p class="muted camera-limitation">原帧视检：此腕部机位经常未包含目标瓶体，不能据它独立判断抓持；有输入不等于目标可见。</p>':''}<div class="media-pair"><figure><img loading="lazy" src="${mediaUrl(image.actual_input)}" width="${image.dimensions[0]}" height="${image.dimensions[1]}" alt="${escape(c)} 第0轮实际提交输入"><figcaption>第0轮实际提交 PNG · ${image.dimensions.join('×')}</figcaption>${image.final_actual_input?`<img loading="lazy" src="${mediaUrl(image.final_actual_input)}" width="640" height="480" alt="${escape(c)} 第${image.final_decision}轮实际提交输入"><figcaption>第${image.final_decision}轮实际提交 PNG · 640×480；同一episode末轮输入</figcaption>`:''}</figure><figure><video controls playsinline preload="none" poster="${mediaUrl(image.actual_input)}" src="${mediaUrl(video.src)}"></video><figcaption>同 episode 原 MP4 · ${video.metadata.width}×${video.metadata.height} · 1× 仿真时间，未重编码</figcaption></figure></div><div class="image-links"><a href="${mediaUrl(image.actual_input)}" download>下载实际输入</a> · <a href="${mediaUrl(image.original_observation)}" download>下载原尺寸观察 ${image.original_dimensions.join('×')}</a> · <a href="${mediaUrl(video.src)}" download>下载完整原视频</a></div></article>`;
}
function registeredScope(c){
 if(c.registered_metric==='two_phase_A_B_withdraw_with_geometric_safety')return `<p class="metric-scope"><strong>完整两阶段与几何安全评分：</strong>${c.completed_phases}/2 阶段；最大倾角 ${c.max_tilt_deg_entire_episode.toFixed(3)}°。评分同时核验位置、支撑、稳定保持与手撤离；单次结果不解释输入因果。</p>`;
 if(c.registered_metric==='four_phase_A_B_withdraw_A_with_geometric_safety'||c.task==='psi_roundtrip_100ml'){
  const tilt=c.max_tilt_deg_entire_episode,hasTilt=typeof tilt==='number'&&Number.isFinite(tilt);
  const completed=c.physical_success===true&&c.completed_phases===4;
  const tiltStop=hasTilt&&tilt>15&&c.stop_reason==='geometric_hard_abort';
  return `<p class="metric-scope"><strong>完整四阶段与几何安全评分：</strong>${c.completed_phases}/4 阶段；最大倾角 ${hasTilt?tilt.toFixed(3)+'°':'未单独记录'}。${tiltStop?'实际倾角超过 15°，已按几何安全门停止。':''}${completed?'本条完整往返评分通过。':'本条完整往返未完成。'}</p>`;
 }
 if(c.registered_metric!=='final_one_second_stable_hold')return '';
 const whole=c.continuously_upright_at_most_15deg;
 return `<aside class="metric-scope ${whole===false?'metric-warning':''}"><strong>评分与指令分别记录：</strong>末1秒稳定抓持 ${c.physical_success?'通过':'未通过'}；全程倾角 ≤15° ${whole===true?'通过':whole===false?'未通过':'未单独核验'}。全程最大倾角 ${c.max_tilt_deg_entire_episode.toFixed(2)}°，末1秒最大 ${c.final_hold_max_tilt_deg.toFixed(2)}°。${whole===false?'本次发生翻倒与重抓，最后恢复直立不能写成全程保持直立；不能在 n<20 时归因于删除 C。':'最终评分不等同于仅凭单张图证明完整1秒稳定。'}</aside>`;
}
function eventFrames(c){return c.original_event_frames?`<div class="event-gallery"><h4>同一 episode 的已视检原帧</h4><div>${c.original_event_frames.map(i=>`<figure><img loading="lazy" src="${mediaUrl(i.src)}" width="640" height="480" alt="${escape(i.label)}"><figcaption>${escape(i.label)} · ${i.camera} · 帧 ${i.frame_index} / 仿真 ${i.simulation_time_s.toFixed(2)} s</figcaption><a href="${mediaUrl(i.src)}" download>下载原帧</a></figure>`).join('')}</div><p class="muted">稀疏原帧用于展示已核视觉事实，不是重新评分；完整原视频见下方对应相机。</p></div>`:'';}
function caseBodyWithoutEnv(c){
 const cover=Object.entries(c.input_channel_coverage).map(([k,v])=>`<tr><td>${k}</td><td>${v.enabled?'保留':'主动删减'}</td><td>${escape(v.first_decision==='initial_no_previous_action'?'首轮无前序动作 / 历史':v.first_decision==='removed_by_condition'?'条件移除':v.first_decision==='populated'?'有值':v.first_decision)}</td><td>${v.nonnull_decisions} / ${c.actual_completed_model_replies}</td></tr>`).join('');
 const omitted=c.original_videos.filter(v=>!v.shown_to_model);
 const absent=omitted.length?`<details><summary>结果核验专用视频：${omitted.map(v=>v.camera).join(', ')}；未提供给 Astra</summary>${omitted.map(v=>`<p><a href="${mediaUrl(v.src)}" download>${escape(v.camera)} 完整原视频</a> · 只作结果证据，无当前/历史图像输入</p>`).join('')}</details>`:'';
 return `${registeredScope(c)}<div class="metric-grid"><div><b class="${c.physical_success?'good':'bad'}">${scoreLabel(c)}${c.completed_phases===null?'':` · ${c.completed_phases} 阶段`}</b><span>${escape(c.stop_reason)}</span></div><div><b>${c.actual_completed_model_replies} 次</b><span>实际完成的模型回复</span></div><div><b>${val(c.pickup_attempts)} / ${val(c.pickup_retries)}</b><span>物理抓取尝试 / 抓取重试</span></div><div><b>${sec(c.timing.episode_wall_s)}</b><span>交互墙钟，含模型等待</span></div><div><b>${sec(c.timing.model_wait_s)}</b><span>模型等待，是墙钟子项</span></div><div><b>${sec(c.timing.simulation_time_s)}</b><span>仿真任务时间</span></div></div><p class="muted">释放重新接触恢复：${c.placement_metric_applicable?val(c.placement_recontact_recoveries):'未适用 / 此条未测'}；任务重启：${val(c.task_retries)}。网络重试：${val(c.network_retries)}。这些数不与模型回复数互换。</p><p><strong>${c.camera_count} 个当前输入相机：</strong>${c.current_camera_names.join(', ')}。<strong>K 的相机条目：</strong>${c.K_camera_names.length?c.K_camera_names.join(', '):'K 主动删减 / 无条目'}。</p><div class="table-scroll"><table class="coverage"><thead><tr><th>通道</th><th>条件</th><th>第0轮</th><th>有值轮次</th></tr></thead><tbody>${cover}</tbody></table></div><p class="muted">H/M/F/C 后续可能产生信息；上表按实际每轮输入计数，空值不是自动判为删减。当前 + 历史图像总数范围 ${Math.min(...c.model_steps.map(x=>x.image_count_including_history))}–${Math.max(...c.model_steps.map(x=>x.image_count_including_history))}。</p>${eventFrames(c)}${c.input_images.map(i=>cameraCard(i.camera,i,c.original_videos.find(v=>v.camera===i.camera),c)).join('')}${absent}<details class="seed-notes"><summary>该次已接受的原帧视检与限制</summary>${visualText(c.visual_review)}</details><details class="seed-evidence"><summary>该次来源绑定与逐轮输入</summary><p>${escape(c.trial_id)} · experiment_kind=${c.experiment_kind} · offset_source=null</p><p>配对初态 SHA：<code>${c.paired_initial_sha256}</code><br>物理终态 SHA：<code>${c.native_terminal_sha256}</code><br>视检记录 SHA：<code>${c.visual_review_sha256}</code></p><p>实际手势：${escape(c.hand_policy.actual_gesture_counts===null?'原签名核验：全部使用冻结手势库与有限微调；本快照未汇总次数':JSON.stringify(c.hand_policy.actual_gesture_counts))} · ${escape(c.hand_policy.mode)}；没有自由手关节输出。</p><p>控制/渲染 ${sec(c.timing.control_render_wall_s)}；编码 ${sec(c.timing.render_encode_wall_s)}（有重叠，不加和）。</p><table class="coverage"><thead><tr><th>轮次</th><th>当前相机</th><th>含历史图像数</th><th>输入尺寸</th></tr></thead><tbody>${c.model_steps.map(s=>`<tr><td>${s.decision}</td><td>${s.current_camera_names.join(', ')}</td><td>${s.image_count_including_history}</td><td>${s.current_dimensions.join('×')}</td></tr>`).join('')}</tbody></table></details>`;
}
function envLabel(c){const e=data.execution_environments[c.trial_id];return `${e.hostname} · admission ${e.admission_gpu_uuid.slice(0,12)}… · CUDA ${e.cuda_uuid?e.cuda_uuid.slice(0,12)+'…':'未记录'} · renderer ${val(e.renderer_index)} · ${e.runtime_package.join(',')} · freeze ${e.source_freeze_sha256.slice(0,12)}…`;}
function caseBody(c){const e=data.execution_environments[c.trial_id];return `<p class="muted"><strong>实际执行环境：</strong>${escape(envLabel(c))}。来源：${e.source==='actual_native_ADMISSION.resource'?'原 ADMISSION 准入快照':'原 SOURCE_IDENTITY 初始快照'}；runtime build/session 未记录。GPU 完整 admission UUID：${escape(e.admission_gpu_uuid)}；CUDA UUID：${escape(e.cuda_uuid||'未记录')}。历史硬件/版本不同，不能把墙钟差异直接归因于输入。</p>`+caseBodyWithoutEnv(c);}
function statLabel(s,group,success){
 const cases=group.trial_ids.map(id=>data.cases.find(c=>c.trial_id===id)).filter(c=>c.physical_success===success&&typeof c.timing.episode_wall_s==='number');
 const environments=new Set(cases.map(c=>{const e=data.execution_environments[c.trial_id];return JSON.stringify([e.hostname,e.admission_gpu_uuid,e.cuda_uuid,e.renderer_index,e.runtime_package,e.source_freeze_sha256]);}));
 const waits=cases.map(c=>c.timing.model_wait_s).filter(x=>typeof x==='number').sort((a,b)=>a-b),mid=waits.length?((waits[Math.floor((waits.length-1)/2)]+waits[Math.floor(waits.length/2)])/2):null;
 return s.n?`${s.n} 条：中位 ${sec(s.median_s)}<br><span class="muted">${sec(s.min_s)}–${sec(s.max_s)}</span><br><span class="muted">含模型等待：中位 ${sec(mid)}（${waits.length} 条；墙钟子项）</span><p class="muted timing-environment-count" data-trials="${cases.map(c=>c.trial_id).join(',')}" data-outcome="${success?'success':'failure'}">环境 ${environments.size} 种；详见 seed 耗时旁</p>`:'暂无接受样本';
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
  return `<tr data-condition="${group.condition}"><td><strong>${escape(group.label)}</strong><div class="condition-id">${group.condition}</div><p class="muted">${escape(group.changed.length?group.changed.join(', ')+' 改变':'完整通道基线；首轮无历史正常为空')}</p><p class="muted input-summary">${inputSummary(group,seeds)}</p></td><td><div class="n-count">注册评分通过 ${group.success_n} / 接受 ${group.accepted_n}</div>${trialCounts(seeds)}<div class="missing">n=${group.accepted_n}/20，待补 ${group.missing_n}<br>${contrast?`配对 ${contrast.paired_n}/20`:'rich 配对基线'}<br>不推断成功率 / 输入效果</div></td><td>成功：${statLabel(group.success_wall,group,true)}<hr>失败：${statLabel(group.failure_wall,group,false)}<p class="muted">描述统计；失败早停不代表提速</p></td><td>${seeds.length?seeds.map(c=>`<details class="seed" data-trial="${c.trial_id}"><summary>seed ${c.seed} · <span class="${c.physical_success?'good':'bad'}">${scoreLabel(c)}</span> · ${c.camera_count} 相机 · ${c.actual_completed_model_replies} 模型回复 · 展开图像与视频</summary><div class="seed-body" data-id="${c.trial_id}"></div></details>`).join(''):'尚无有效样本；不把未运行计作失败。'}</td></tr>`;
 }).join('');
 for(const el of document.querySelectorAll('details.seed'))el.addEventListener('toggle',()=>{if(el.open&&!el.dataset.rendered){el.querySelector('.seed-body').innerHTML=caseBody(data.cases.find(c=>c.trial_id===el.dataset.trial));el.dataset.rendered='true';}scheduleReaderContext();});
 window.astraReportTask=task;window.astraReportVisibleCohorts=cohorts.length;
}
(async()=>{
 data=await(await fetch(new URL('data.json', reportBase))).json();window.astraReportData=data;
 const environments=await(await fetch(new URL('environment_v2.json', reportBase))).json();data.execution_environments=environments.environments;window.astraReportEnvironment=environments;
 $('#task').innerHTML=Object.entries(data.tasks).map(([id,t])=>`<option value="${id}">${escape(t.name)}</option>`).join('');
 const seen=new Set();for(const c of data.cohorts)if(!seen.has(c.condition)){seen.add(c.condition);$('#condition').insertAdjacentHTML('beforeend',`<option value="${c.condition}">${escape(c.label)}</option>`);}
 $('#task').addEventListener('change',render);$('#condition').addEventListener('change',render);$('#collapse').addEventListener('click',()=>document.querySelectorAll('details.seed').forEach(d=>{d.open=false;d.querySelectorAll('video').forEach(v=>v.pause());}));
 $('#channels tbody').innerHTML=Object.entries(data.channel_definitions).map(([k,v])=>`<tr><td><strong>${k}</strong></td><td>${escape(v)}</td></tr>`).join('');
 for(const [id,key] of [['camera-scope','camera_scope'],['hand-scope','hand_scope'],['retry-scope','retry_scope'],['timing-scope','timing_scope']])$('#'+id).textContent=data[key];
 $('#frontier-sha').textContent=data.frontier_sha256;
 $('#exclusions-scope').textContent=data.exclusions_scope;
 const cutoff=data.execution_cutoff;$('#execution-cutoff').textContent=`固定核收截止 ${cutoff.as_of_utc}。${cutoff.scope} v84有3条、v85有8条、v91有${data.unattempted_excluded_v91.count}条未尝试尾项；均不记物理失败。`;
 $('#exclusions').innerHTML=data.exclusions.map(x=>`<div class="excluded-card"><strong>${escape(x.trial_id||x.kind)}</strong><p>${escape(x.kind==='offset_library_reuse'?'偏移库资格测试：Local4090 3 条，GPU1 3 条；各含1条原位与2条位置扰动。当前已独立接受的数据集：Local4090 30条、PRO6000 GPU1 68条，共98/98条。缓存复用零 Astra 调用，不进入输入消融分母。':x.reason||'独立记录，不计输入消融。')}</p><p>不计入有效 ${data.accepted_trials} 条或评分通过 / 已接受分母。${typeof x.completed_actual_model_replies==='number'?`实际完成回复 ${x.completed_actual_model_replies} 次；${typeof x.failed_signed_responses==='number'?`签名失败响应 ${x.failed_signed_responses} 次；`:''}中断不当作相机条件的物理失败，不推断后端原因。`:''}</p></div>`).join('');
 const cached=data.cached_collection.representative_episode;
 $('#cached-example-body').innerHTML=`<p>已核收 ${data.cached_collection.accepted_n}/${data.cached_collection.planned_postqualification_n} 条，待补 ${data.cached_collection.remaining_n}；正式消融分母新增 0。代表 seed ${cached.seed}：完整阶段 ${cached.completed_phases}/4，抓取尝试/重试 ${cached.pickup_attempts}/${cached.pickup_retries}；任务重启 ${val(cached.task_retries)}；交互墙钟 ${sec(cached.episode_wall_s)}，仿真任务 ${sec(cached.simulation_time_s)}，新增Astra调用 0。</p><article class="camera"><h4>${cached.camera} · 偏移复用的同次采集原件</h4><div class="media-pair"><figure><img loading="lazy" src="${mediaUrl(cached.original_frame)}" width="640" height="480" alt="seed21072结果原视频首帧"><figcaption>已核结果原视频第0帧；没有提交给Astra。</figcaption></figure><figure><video controls preload="metadata" width="640" height="480" src="${mediaUrl(cached.source_video)}"></video><figcaption>同seed完整原视频 · ${cached.fps} Hz仿真，${cached.decoded_frames}帧；原完整解码核收沿用。</figcaption></figure></div><p class="muted">${escape(cached.scope)} 核收截止 ${escape(data.cached_collection.as_of_utc)}。抓取偏移来自先前冻结库；此批按位置扰动跟踪，不是重新调用Astra，也不用于输入缺失效果推断。</p></article>`;
 render();window.astraReportReady=true;
})().catch(e=>{$('#task-description').textContent='报告数据加载失败：'+e.message;throw e;});
