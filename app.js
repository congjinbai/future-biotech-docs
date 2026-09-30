(() => {
  const cfg = window.APP_CONFIG || {};
  const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR_') && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('YOUR_');
  const supabase = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  const I18N = {
    zh:{loginId:'个人编号 / ID',password:'密码',login:'登录',privacy:'每位用户只能访问分配给自己的文件。',logout:'退出',myDocs:'我的文件',chooseDoc:'选择需要填写或签署的文件。',noDocs:'目前没有分配给您的文件。',back:'返回文件列表',print:'打印 / PDF',image:'生成图片',fillInfo:'填写信息',signature:'手写签名',clear:'清除',generated:'已生成',saveImage:'保存图片',badLogin:'账号或密码错误。',notConfigured:'网站尚未连接数据库。请先完成 Supabase 配置。'},
    ru:{loginId:'Личный ID',password:'Пароль',login:'Войти',privacy:'Каждый пользователь видит только назначенные ему документы.',logout:'Выйти',myDocs:'Мои документы',chooseDoc:'Выберите документ для заполнения или подписания.',noDocs:'Для вас пока нет назначенных документов.',back:'К списку документов',print:'Печать / PDF',image:'Создать изображение',fillInfo:'Заполнить информацию',signature:'Рукописная подпись',clear:'Очистить',generated:'Готово',saveImage:'Сохранить изображение',badLogin:'Неверный ID или пароль.',notConfigured:'Сайт ещё не подключён к базе данных. Сначала настройте Supabase.'}
  };

  let lang = localStorage.getItem('fb_lang') || 'zh';
  let profile = null;
  let documents = [];
  let currentDoc = null;
  let signatureData = '';

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const els = {
    loginView:$('#loginView'), appView:$('#appView'), loginForm:$('#loginForm'), loginId:$('#loginId'), password:$('#password'), loginError:$('#loginError'),
    helloName:$('#helloName'), documentList:$('#documentList'), emptyState:$('#emptyState'), documentListView:$('#documentListView'), documentView:$('#documentView'), documentPaper:$('#documentPaper'),
    dynamicFields:$('#dynamicFields'), signaturePad:$('#signaturePad'), imageResult:$('#imageResult'), generatedImage:$('#generatedImage'), downloadImage:$('#downloadImage')
  };

  function t(key){ return I18N[lang][key] || key; }
  function setLang(next){ lang=next; localStorage.setItem('fb_lang',lang); document.documentElement.lang=lang==='zh'?'zh-CN':'ru'; $$('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n)); $$('.lang-btn').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang)); if(currentDoc) renderDocument(); else if(profile) renderList(); }

  $$('.lang-btn').forEach(btn=>btn.addEventListener('click',()=>setLang(btn.dataset.lang)));
  $('#switchLangBtn').addEventListener('click',()=>setLang(lang==='zh'?'ru':'zh'));

  els.loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    els.loginError.classList.add('hidden');
    if(!configured){ showLoginError(t('notConfigured')); return; }
    const id = els.loginId.value.trim().toUpperCase();
    const email = `${id.toLowerCase()}@${cfg.LOGIN_EMAIL_DOMAIN || 'futurebiotech.local'}`;
    const { error } = await supabase.auth.signInWithPassword({ email, password: els.password.value });
    if(error){ showLoginError(t('badLogin')); return; }
    await bootAuthenticated();
  });

  function showLoginError(msg){ els.loginError.textContent=msg; els.loginError.classList.remove('hidden'); }

  async function bootAuthenticated(){
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user) return showLogin();
    const { data:p, error:pe } = await supabase.from('profiles').select('id,employee_code,display_name_ru,display_name_zh').eq('id',user.id).single();
    if(pe || !p){ await supabase.auth.signOut(); showLoginError('Profile not found'); return; }
    profile=p;
    const { data:docs, error:de } = await supabase.from('documents').select('*').eq('owner_id',user.id).eq('is_active',true).order('created_at',{ascending:false});
    if(de){ showLoginError(de.message); return; }
    documents=docs||[];
    els.loginView.classList.add('hidden'); els.appView.classList.remove('hidden'); els.documentView.classList.add('hidden'); els.documentListView.classList.remove('hidden');
    renderList();
  }

  function showLogin(){ profile=null;documents=[];currentDoc=null; els.appView.classList.add('hidden');els.loginView.classList.remove('hidden'); }

  $('#logoutBtn').addEventListener('click', async()=>{ if(supabase) await supabase.auth.signOut(); showLogin(); });
  $('#backBtn').addEventListener('click',()=>{ currentDoc=null; signatureData=''; els.documentView.classList.add('hidden'); els.documentListView.classList.remove('hidden'); els.imageResult.classList.add('hidden'); renderList(); });
  $('#printBtn').addEventListener('click',()=>window.print());
  $('#imageBtn').addEventListener('click',generateImage);

  function renderList(){
    const name = lang==='zh' ? (profile.display_name_zh||profile.display_name_ru) : (profile.display_name_ru||profile.display_name_zh);
    els.helloName.textContent = (lang==='zh'?'您好，':'Здравствуйте, ') + name;
    els.documentList.innerHTML=''; els.emptyState.classList.toggle('hidden',documents.length>0);
    documents.forEach(doc=>{
      const payload=doc.payload||{};
      const div=document.createElement('article'); div.className='card doc-card';
      div.innerHTML=`<div class="doc-icon">📄</div><h4>${escapeHtml(lang==='zh'?(doc.title_zh||doc.title_ru):(doc.title_ru||doc.title_zh))}</h4><p>${escapeHtml(payload.summary?.[lang] || typeLabel(doc.type))}</p><div class="doc-meta">${new Date(doc.created_at).toLocaleDateString(lang==='zh'?'zh-CN':'ru-RU')}</div>`;
      div.addEventListener('click',()=>openDoc(doc)); els.documentList.appendChild(div);
    });
  }

  function typeLabel(type){
    const labels={salary_two_companies:{zh:'工资收条',ru:'Расписка о получении зарплаты'},salary_global:{zh:'工资收条',ru:'Расписка о получении зарплаты'},consulting_receipt:{zh:'服务费收条',ru:'Расписка за консультационные услуги'},application:{zh:'申请书',ru:'Обращение'}};
    return (labels[type]||{zh:type,ru:type})[lang];
  }

  function openDoc(doc){ currentDoc=doc; signatureData=''; els.documentListView.classList.add('hidden'); els.documentView.classList.remove('hidden'); els.imageResult.classList.add('hidden'); renderFields(); renderDocument(); window.scrollTo({top:0,behavior:'smooth'}); }

  function renderFields(){
    const specs = fieldSpecs(currentDoc.type); els.dynamicFields.innerHTML='';
    specs.forEach(f=>{
      const label=document.createElement('label'); if(f.full) label.classList.add('full');
      label.innerHTML=`<span>${escapeHtml(f.label[lang])}</span><input type="${f.inputType||'text'}" data-field="${f.key}" value="${escapeAttr(currentDoc.payload?.fields?.[f.key]||'')}" placeholder="${escapeAttr(f.placeholder?.[lang]||'')}" />`;
      label.querySelector('input').addEventListener('input',e=>{ currentDoc.payload.fields=currentDoc.payload.fields||{}; currentDoc.payload.fields[f.key]=e.target.value; renderDocument(); });
      els.dynamicFields.appendChild(label);
    });
  }

  function fieldSpecs(type){
    if(type==='application') return [
      {key:'applicant_name',label:{zh:'申请人姓名',ru:'ФИО заявителя'},full:true},{key:'registration_date',label:{zh:'注册日期',ru:'Дата регистрации'},inputType:'date'},
      {key:'partner_id',label:{zh:'会员编号',ru:'ID партнёра'}},{key:'phone',label:{zh:'注册手机号',ru:'Телефон при регистрации'}},
      {key:'sponsor_name',label:{zh:'推荐人姓名',ru:'ФИО спонсора'},full:true},{key:'sponsor_id',label:{zh:'推荐人会员编号',ru:'ID партнёра спонсора'}},{key:'sponsor_phone',label:{zh:'推荐人手机号',ru:'Телефон спонсора'}},
      {key:'application_date',label:{zh:'申请日期',ru:'Дата обращения'},inputType:'date'}];
    return [{key:'period_from',label:{zh:'工作/服务期间：开始',ru:'Период: с'},inputType:'date'},{key:'period_to',label:{zh:'工作/服务期间：结束',ru:'Период: по'},inputType:'date'},{key:'document_date',label:{zh:'文件日期',ru:'Дата документа'},inputType:'date'}];
  }

  function renderDocument(){
    if(!currentDoc) return;
    const p=currentDoc.payload||{}; const f=p.fields||{}; const sig=signatureData?`<img class="sig-image" src="${signatureData}" alt="signature">`:'________________';
    if(currentDoc.type==='salary_two_companies'){
      els.documentPaper.innerHTML = bilingualReceipt({
        ru:[`Я, ${p.person_ru||''}, ${p.passport_ru||''}.`,`Получил(а) денежные средства в общей сумме ${p.amount_ru||''}.`,`Сумма прописью: ${p.amount_words_ru||''}.`,`Деньги выплачены двумя компаниями: ${p.companies_ru||''}.`,`Данная сумма является заработной платой за рабочий период с ${fmt(f.period_from,'ru')} по ${fmt(f.period_to,'ru')}.`,`Претензий по размеру выплаченной заработной платы не имею.`],
        zh:[`本人 ${p.person_zh||''}，${p.passport_zh||''}。`,`今收到现金总金额：${p.amount_zh||''}。`,`大写：${p.amount_words_zh||''}。`,`款项由两家公司共同发放：${p.companies_zh||''}。`,`该笔资金为 ${fmt(f.period_from,'zh')} 至 ${fmt(f.period_to,'zh')} 工作周期的劳动工资。`,`本人确认足额收到款项，对工资发放金额无任何异议。`],date:f.document_date,sig});
    } else if(currentDoc.type==='salary_global'){
      els.documentPaper.innerHTML = bilingualReceipt({ru:[`Я, ${p.person_ru||''}, ${p.passport_ru||''}.`,`Получил(а) денежные средства в общей сумме ${p.amount_ru||''}.`,`Сумма прописью: ${p.amount_words_ru||''}.`,`Данная сумма является заработной платой за рабочий период с ${fmt(f.period_from,'ru')} по ${fmt(f.period_to,'ru')} и выплачена ${p.company_ru||''}.`,`Претензий по размеру выплаченной заработной платы не имею.`],zh:[`本人 ${p.person_zh||''}，${p.passport_zh||''}。`,`今收到现金总金额：${p.amount_zh||''}。`,`大写：${p.amount_words_zh||''}。`,`该笔资金为 ${fmt(f.period_from,'zh')} 至 ${fmt(f.period_to,'zh')} 工作周期的劳动工资，由${p.company_zh||''}发放。`,`本人确认足额收到款项，对工资发放金额无任何异议。`],date:f.document_date,sig});
    } else if(currentDoc.type==='consulting_receipt'){
      els.documentPaper.innerHTML = bilingualReceipt({ru:[`Я, ${p.person_ru||''}, ${p.passport_ru||''}.`,`Получил(а) денежные средства в общей сумме ${p.amount_ru||''}.`,`Сумма прописью: ${p.amount_words_ru||''}.`,`Данная сумма получена за оказанные ${p.service_ru||'консультационные услуги'} для ${p.company_ru||''} за период с ${fmt(f.period_from,'ru')} по ${fmt(f.period_to,'ru')}.`,`Претензий по размеру выплаченной суммы не имею.`],zh:[`本人 ${p.person_zh||''}，${p.passport_zh||''}。`,`今收到现金总金额：${p.amount_zh||''}。`,`大写：${p.amount_words_zh||''}。`,`该笔资金是从 ${fmt(f.period_from,'zh')} 至 ${fmt(f.period_to,'zh')} 为${p.company_zh||''}提供的${p.service_zh||'咨询服务费'}。`,`本人确认足额收到款项，对发放的金额无任何异议。`],date:f.document_date,sig,receiver:true});
    } else if(currentDoc.type==='application'){
      const applicant=f.applicant_name||'(ФИО заявителя)';
      els.documentPaper.innerHTML=`<div class="right">Руководителю Корпорации FUTURE BIOTECH (РОССИЯ)<br>господину ${escapeHtml(p.manager_ru||'Ян Сияну')}<br>От ${escapeHtml(applicant)}</div><h1>ОБРАЩЕНИЕ</h1><p>Я, ${escapeHtml(applicant)}, партнер Корпорации FUTURE BIOTECH (РОССИЯ) с ${fmt(f.registration_date,'ru')} г. ID партнёра ${escapeHtml(f.partner_id||'')}, телефон при регистрации ${escapeHtml(f.phone||'')}.</p><p>Прошу ВАС перевести меня вместе со всей моей структурой, с сохранением всех статусов и объемов, в первую линию ${escapeHtml(f.sponsor_name||'')}, ${escapeHtml(f.sponsor_id||'')}, ${escapeHtml(f.sponsor_phone||'')}, списки и «фото-скрин» со спонсорскими объемами моей команды прилагаю.</p><div class="sign-line"><div>Дата обращения: ${fmt(f.application_date,'ru')}</div><div>ФИО: ${escapeHtml(applicant)}<br>Подпись: ${sig}</div></div><hr class="doc-separator"><div class="right">致未来生物科技集团<br>俄罗斯区负责人<br>${escapeHtml(p.manager_zh||'杨希阳先生')}<br>申请人：${escapeHtml(applicant)}</div><h2>申请书</h2><p>本人${escapeHtml(applicant)}，自${fmt(f.registration_date,'zh')}起成为未来生物科技集团（俄罗斯区域）合作经销商，会员编号：${escapeHtml(f.partner_id||'')}，注册预留手机号：${escapeHtml(f.phone||'')}。</p><p>恳请贵公司将本人及全部下属团队架构整体迁移至${escapeHtml(f.sponsor_name||'')}，${escapeHtml(f.sponsor_id||'')}，${escapeHtml(f.sponsor_phone||'')}的一级直推下线，迁移时完整保留本人所有会员的职级与全部销售业绩，随本申请书附上本人团队成员名单及包含团队业绩数据的截图凭证。</p><div class="sign-line"><div>申请日期：${fmt(f.application_date,'zh')}</div><div>申请人：${escapeHtml(applicant)}<br>签字：${sig}</div></div>`;
    }
  }

  function bilingualReceipt({ru,zh,date,sig,receiver=false}){
    return `<h1>Расписка</h1>${ru.map(x=>`<p>${escapeHtml(x)}</p>`).join('')}<div class="sign-line"><div>Дата: ${fmt(date,'ru')}</div><div>${receiver?'Подпись получателя':'Подпись сотрудника'}: ${sig}</div></div><hr class="doc-separator"><h2>收条</h2>${zh.map(x=>`<p>${escapeHtml(x)}</p>`).join('')}<div class="sign-line"><div>日期：${fmt(date,'zh')}</div><div>${receiver?'收款人签字':'员工签字'}：${sig}</div></div>`;
  }

  function fmt(value,l){ if(!value) return '____'; const d=new Date(value+'T00:00:00'); return l==='zh'?`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`:d.toLocaleDateString('ru-RU'); }
  function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function escapeAttr(s=''){ return escapeHtml(s); }

  // Signature pad
  const canvas=els.signaturePad, ctx=canvas.getContext('2d'); ctx.lineWidth=3; ctx.lineCap='round'; ctx.strokeStyle='#164e9b'; let drawing=false;
  function pos(e){ const r=canvas.getBoundingClientRect(); const p=e.touches?e.touches[0]:e; return {x:(p.clientX-r.left)*(canvas.width/r.width), y:(p.clientY-r.top)*(canvas.height/r.height)}; }
  function start(e){drawing=true; const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);e.preventDefault()}
  function move(e){if(!drawing)return;const p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke();e.preventDefault()}
  function end(){if(!drawing)return;drawing=false;signatureData=canvas.toDataURL('image/png');renderDocument()}
  canvas.addEventListener('mousedown',start);canvas.addEventListener('mousemove',move);window.addEventListener('mouseup',end);canvas.addEventListener('touchstart',start,{passive:false});canvas.addEventListener('touchmove',move,{passive:false});canvas.addEventListener('touchend',end);
  $('#clearSignatureBtn').addEventListener('click',()=>{ctx.clearRect(0,0,canvas.width,canvas.height);signatureData='';renderDocument()});

  async function generateImage(){
    renderDocument();
    const out = await html2canvas(els.documentPaper,{scale:2,backgroundColor:'#ffffff',useCORS:true});
    const url=out.toDataURL('image/png'); els.generatedImage.src=url; els.downloadImage.href=url; els.imageResult.classList.remove('hidden'); els.imageResult.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function init(){ setLang(lang); if(!configured) return; const {data:{session}}=await supabase.auth.getSession(); if(session) await bootAuthenticated(); }
  init();
})();
