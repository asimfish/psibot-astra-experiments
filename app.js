'use strict';
const reportBase = new URL('.', document.currentScript.src);
const mediaUrl = path => new URL(path, reportBase).href;
const $ = s => document.querySelector(s);
const escape = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sec = v => typeof v === 'number' ? `${v.toFixed(1)} s` : '未测';
const val = v => v === null || v === undefined ? '未测' : String(v);
let data;
function visualText(v){return Object.entries(v).map(([k,x])=>`<p><strong>${escape(k)}</strong>：${escape(typeof x==='object'?JSON.stringify(x):x)}</p>`).join('');}
function cameraCard(c,image,video){
 const g=image.geometry,angle=typeof g.pitch_down_deg==='number'?`向下倾角 ${g.pitch_down_deg.toFixed(1)}°，世界方位 ${g.yaw_world_deg.toFixed(1)}°`:'角度证据缺失';
 return `<article class="camera" data-camera="${escape(c)}"><h4>${escape(c)} · ${escape(image.dimensions.join('×'))} 实际输入</h4><p class="muted">${angle}（${g.source==='actual_visible_K'?'该轮给 Astra 的 K':'渲染证据，不是该轮给 Astra 的 K'}）</p><div class="media-pair"><figure><img loading="lazy" src="${mediaUrl(image.actual_input)}" width="${image.dimensions[0]}" height="${image.dimensions[1]}" alt="${escape(c)} 第0轮实际提交输入"><figcaption>第0轮实际提交 PNG · ${image.dimensions.join('×')}</figcaption></figure><figure><video controls playsinline preload="none" poster="${mediaUrl(image.actual_input)}" src="${mediaUrl(video.src)}"></video><figcaption>同 episode 原 MP4 · ${video.metadata.width}×${video.metadata.height} · 1× 仿真时间，未重编码</figcaption></figure></div><div class="image-links"><a href="${mediaUrl(image.actual_input)}" download>下载实际输入</a> · <a href="${mediaUrl(image.original_observation)}" download>下载原尺寸观察 ${image.original_dimensions.join('×')}</a> · <a href="${mediaUrl(video.src)}" download>下载完整原视频</a></div></article>`;
}
function caseBodyWithoutEnv(c){
 const cover=Object.entries(c.input_channel_coverage).map(([k,v])=>`<tr><td>${k}</td><td>${v.enabled?'保留':'主动删减'}</td><td>${escape(v.first_decision==='initial_no_previous_action'?'首轮无前序动作 / 历史':v.first_decision==='removed_by_condition'?'条件移除':v.first_decision==='populated'?'有值':v.first_decision)}</td><td>${v.nonnull_decisions} / ${c.actual_completed_model_replies}</td></tr>`).join('');
 const omitted=c.original_videos.filter(v=>!v.shown_to_model);
 const absent=omitted.length?`<details><summary>结果核验专用视频：${omitted.map(v=>v.camera).join(', ')}；未提供给 Astra</summary>${omitted.map(v=>`<p><a href="${mediaUrl(v.src)}" download>${escape(v.camera)} 完整原视频</a> · 只作结果证据，无当前/历史图像输入</p>`).join('')}</details>`:'';
 return `<div class="metric-grid"><div><b class="${c.physical_success?'good':'bad'}">${c.physical_success?'物理成功':'物理失败'}${c.completed_phases===null?'':` · ${c.completed_phases} 阶段`}</b><span>${escape(c.stop_reason)}</span></div><div><b>${c.actual_completed_model_replies} 次</b><span>实际完成的模型回复</span></div><div><b>${val(c.pickup_attempts)} / ${val(c.pickup_retries)}</b><span>物理抓取尝试 / 抓取重试</span></div><div><b>${sec(c.timing.episode_wall_s)}</b><span>交互墙钟，含模型等待</span></div><div><b>${sec(c.timing.model_wait_s)}</b><span>模型等待，是墙钟子项</span></div><div><b>${sec(c.timing.simulation_time_s)}</b><span>仿真任务时间</span></div></div><p class="muted">释放重新接触恢复：${c.placement_metric_applicable?val(c.placement_recontact_recoveries):'未适用 / 此条未测'}；任务重启：${val(c.task_retries)}。网络重试：${val(c.network_retries)}。这些数不与模型回复数互换。</p><p><strong>${c.camera_count} 个当前输入相机：</strong>${c.current_camera_names.join(', ')}。<strong>K 的相机条目：</strong>${c.K_camera_names.length?c.K_camera_names.join(', '):'K 主动删减 / 无条目'}。</p><div class="table-scroll"><table class="coverage"><thead><tr><th>通道</th><th>条件</th><th>第0轮</th><th>有值轮次</th></tr></thead><tbody>${cover}</tbody></table></div><p class="muted">H/M/F/C 后续可能产生信息；上表按实际每轮输入计数，空值不是自动判为删减。当前 + 历史图像总数范围 ${Math.min(...c.model_steps.map(x=>x.image_count_including_history))}–${Math.max(...c.model_steps.map(x=>x.image_count_including_history))}。</p>${c.input_images.map(i=>cameraCard(i.camera,i,c.original_videos.find(v=>v.camera===i.camera))).join('')}${absent}<details class="seed-notes"><summary>该次已接受的原帧视检与限制</summary>${visualText(c.visual_review)}</details><details class="seed-evidence"><summary>该次来源绑定与逐轮输入</summary><p>${escape(c.trial_id)} · experiment_kind=${c.experiment_kind} · offset_source=null</p><p>配对初态 SHA：<code>${c.paired_initial_sha256}</code><br>物理终态 SHA：<code>${c.native_terminal_sha256}</code><br>视检记录 SHA：<code>${c.visual_review_sha256}</code></p><p>实际手势：${escape(JSON.stringify(c.hand_policy.actual_gesture_counts))} · ${escape(c.hand_policy.mode)}；没有自由手关节输出。</p><p>控制/渲染 ${sec(c.timing.control_render_wall_s)}；编码 ${sec(c.timing.render_encode_wall_s)}（有重叠，不加和）。</p><table class="coverage"><thead><tr><th>轮次</th><th>当前相机</th><th>含历史图像数</th><th>输入尺寸</th></tr></thead><tbody>${c.model_steps.map(s=>`<tr><td>${s.decision}</td><td>${s.current_camera_names.join(', ')}</td><td>${s.image_count_including_history}</td><td>${s.current_dimensions.join('×')}</td></tr>`).join('')}</tbody></table></details>`;
}
function envLabel(c){const e=data.execution_environments[c.trial_id];return `${e.hostname} · admission ${e.admission_gpu_uuid.slice(0,12)}… · CUDA ${e.cuda_uuid?e.cuda_uuid.slice(0,12)+'…':'未记录'} · renderer ${val(e.renderer_index)} · ${e.runtime_package.join(',')} · freeze ${e.source_freeze_sha256.slice(0,12)}…`;}
function caseBody(c){const e=data.execution_environments[c.trial_id];return `<p class="muted"><strong>实际执行环境：</strong>${escape(envLabel(c))}。来源：原 SOURCE_IDENTITY 初始快照；runtime build/session 未记录。GPU 完整 admission UUID：${escape(e.admission_gpu_uuid)}；CUDA UUID：${escape(e.cuda_uuid||'未记录')}。历史硬件/版本不同，不能把墙钟差异直接归因于输入。</p>`+caseBodyWithoutEnv(c);}
function statLabel(s,group,success){
 const cases=group.trial_ids.map(id=>data.cases.find(c=>c.trial_id===id)).filter(c=>c.physical_success===success&&typeof c.timing.episode_wall_s==='number');
 const environments=new Set(cases.map(c=>{const e=data.execution_environments[c.trial_id];return JSON.stringify([e.hostname,e.admission_gpu_uuid,e.cuda_uuid,e.renderer_index,e.runtime_package,e.source_freeze_sha256]);}));
 return s.n?`${s.n} 条：中位 ${sec(s.median_s)}<br><span class="muted">${sec(s.min_s)}–${sec(s.max_s)}</span><p class="muted timing-environment-count" data-trials="${cases.map(c=>c.trial_id).join(',')}" data-outcome="${success?'success':'failure'}">环境 ${environments.size} 种；详见 seed 耗时旁</p>`:'暂无接受样本';
}
function inputSummary(group,seeds){
 if(seeds.length){const configs=[...new Set(seeds.map(c=>`${c.camera_count} 相机：${c.current_camera_names.join(', ')} · ${c.input_images[0].dimensions.join('×')}`))];return `已接受样本实际输入：${configs.map(escape).join('<br>')}`;}
 const baseline=data.cases.find(c=>c.task===group.task&&c.condition==='rich')||data.cases.filter(c=>c.task===group.task).sort((a,b)=>b.camera_count-a.camera_count)[0];
 const omitted=group.condition.match(/^minus_(head|chest|third|wrist)$/);
 const names=baseline.current_camera_names.filter(c=>!omitted||c!==omitted[1]+'_camera');
 const dimensions=group.condition==='rgb_half_resolution'?'320×240':'640×480';
 return `计划输入（协议，尚无本组样本）：${names.length} 相机：${names.map(escape).join(', ')} · ${dimensions}`;
}
function render(){
 const task=$('#task').value,condition=$('#condition').value;
 $('#task-description').textContent=`${data.tasks[task].robot} · ${data.tasks[task].goal}`;
 const cohorts=data.cohorts.filter(c=>c.task===task&&(condition==='all'||c.condition===condition));
 $('#matrix tbody').innerHTML=cohorts.map(group=>{
  const contrast=data.paired_contrasts.find(x=>x.task===task&&x.condition===group.condition);
  const seeds=group.trial_ids.map(id=>data.cases.find(c=>c.trial_id===id)).sort((a,b)=>a.seed-b.seed);
  return `<tr data-condition="${group.condition}"><td><strong>${escape(group.label)}</strong><div class="condition-id">${group.condition}</div><p class="muted">${escape(group.changed.length?group.changed.join(', ')+' 改变':'完整通道基线；首轮无历史正常为空')}</p><p class="muted input-summary">${inputSummary(group,seeds)}</p></td><td><div class="n-count">成功 ${group.success_n} / 接受 ${group.accepted_n}</div><div class="missing">n=${group.accepted_n}/20，待补 ${group.missing_n}<br>${contrast?`配对 ${contrast.paired_n}/20`:'rich 配对基线'}<br>不推断成功率 / 输入效果</div></td><td>成功：${statLabel(group.success_wall,group,true)}<hr>失败：${statLabel(group.failure_wall,group,false)}<p class="muted">描述统计；失败早停不代表提速</p></td><td>${seeds.length?seeds.map(c=>`<details class="seed" data-trial="${c.trial_id}"><summary>seed ${c.seed} · <span class="${c.physical_success?'good':'bad'}">${c.physical_success?'成功':'失败'}</span> · ${c.camera_count} 相机 · ${c.actual_completed_model_replies} 模型回复 · 展开图像与视频</summary><div class="seed-body" data-id="${c.trial_id}"></div></details>`).join(''):'尚无有效样本；不把未运行计作失败。'}</td></tr>`;
 }).join('');
 for(const el of document.querySelectorAll('details.seed'))el.addEventListener('toggle',()=>{if(el.open&&!el.dataset.rendered){el.querySelector('.seed-body').innerHTML=caseBody(data.cases.find(c=>c.trial_id===el.dataset.trial));el.dataset.rendered='true';}});
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
 $('#exclusions').innerHTML=data.exclusions.map(x=>`<div class="excluded-card"><strong>${escape(x.trial_id||x.kind)}</strong><p>${escape(x.reason||'偏移库复用：0 条已接受数据集，1 次资格 smoke + 2 次 jitter smoke（共 3 次），均零 Astra 调用；与输入消融分开。')}</p><p>不计入有效 53 条或成功 / 已接受分母。${x.completed_actual_model_replies!==undefined?`实际完成回复 ${x.completed_actual_model_replies} 次；传输失败不当作相机条件的物理失败。`:''}</p></div>`).join('');
 render();window.astraReportReady=true;
})().catch(e=>{$('#task-description').textContent='报告数据加载失败：'+e.message;throw e;});
