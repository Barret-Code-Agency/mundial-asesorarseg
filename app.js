(() => {
    'use strict';

    const LS_KEY = 'mundial-asesorarseg-resultados-v1';
    const state = {
        data: null,
        venuesById: {},
        results: {},
        currentView: 'grupos',
        filtroFase: 'todos',
        filtroGrupo: 'todos',
    };

    /* ---------- INIT ---------- */
    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        try {
            const res = await fetch('./data/mundial.json');
            if (!res.ok) throw new Error('No pude cargar mundial.json');
            state.data = await res.json();
            state.venuesById = Object.fromEntries(state.data.sedes.map(v => [v.id, v]));
            state.results = loadResults();

            bindTabs();
            bindReset();
            bindShare();
            bindFilters();
            populateGroupFilter();

            renderAll();
            updateStatus();
        } catch (err) {
            document.querySelector('.main').innerHTML =
                `<p style="color:var(--rojo);padding:20px;text-align:center">Error al cargar datos: ${err.message}</p>`;
        }
    }

    /* ---------- PERSISTENCIA ---------- */
    function loadResults() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }

    function saveResults() {
        localStorage.setItem(LS_KEY, JSON.stringify(state.results));
    }

    function updateStatus() {
        const n = Object.keys(state.results).length;
        const el = document.getElementById('status-info');
        if (!el) return;
        el.textContent = n === 0 ? '' : `${n} resultado${n === 1 ? '' : 's'} guardado${n === 1 ? '' : 's'} en este navegador`;
    }

    /* ---------- TABS ---------- */
    function bindTabs() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const view = tab.dataset.view;
                document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
                document.querySelectorAll('.view').forEach(v => v.classList.remove('view-active'));
                document.getElementById('view-' + view).classList.add('view-active');
                state.currentView = view;
            });
        });
    }

    function bindReset() {
        document.getElementById('btn-reset').addEventListener('click', () => {
            if (!confirm('¿Borrar todos los resultados cargados? Los datos del fixture vuelven a estar vacíos.')) return;
            state.results = {};
            saveResults();
            renderAll();
            updateStatus();
        });
    }

    function bindShare() {
        const btn = document.getElementById('btn-share');
        const originalText = btn.textContent;
        btn.addEventListener('click', async () => {
            const url = location.href;
            try {
                if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
                    await navigator.share({ title: document.title, url });
                } else {
                    await navigator.clipboard.writeText(url);
                    btn.textContent = '¡Copiado!';
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.textContent = originalText;
                        btn.classList.remove('copied');
                    }, 2000);
                }
            } catch (err) {
                const ta = document.createElement('textarea');
                ta.value = url;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                btn.textContent = '¡Copiado!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('copied');
                }, 2000);
            }
        });
    }

    function bindFilters() {
        document.getElementById('filter-fase').addEventListener('change', e => {
            state.filtroFase = e.target.value;
            renderFixture();
        });
        document.getElementById('filter-grupo').addEventListener('change', e => {
            state.filtroGrupo = e.target.value;
            renderFixture();
        });
    }

    function populateGroupFilter() {
        const sel = document.getElementById('filter-grupo');
        Object.keys(state.data.grupos).sort().forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = 'Grupo ' + g;
            sel.appendChild(opt);
        });
    }

    /* ---------- RENDER ---------- */
    function renderAll() {
        renderGroups();
        renderFixture();
        renderVenues();
        renderBracket();
    }

    function renderGroups() {
        const cont = document.getElementById('groups-grid');
        cont.innerHTML = '';
        const partidosGrupo = state.data.partidos.filter(p => p.fase === 'grupos');

        Object.entries(state.data.grupos).forEach(([groupId, teams]) => {
            const tabla = calcularTablaGrupo(teams, partidosGrupo.filter(p => p.grupo === groupId));
            cont.appendChild(buildGroupCard(groupId, tabla));
        });
    }

    function calcularTablaGrupo(teams, partidos) {
        const tabla = teams.map(t => ({
            equipo: t, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0
        }));
        const byTeam = Object.fromEntries(tabla.map(r => [r.equipo, r]));

        partidos.forEach(p => {
            const r = state.results[p.id];
            if (!r || r.local == null || r.visitante == null) return;
            const h = byTeam[p.local];
            const a = byTeam[p.visitante];
            if (!h || !a) return;
            h.pj++; a.pj++;
            h.gf += r.local; h.gc += r.visitante;
            a.gf += r.visitante; a.gc += r.local;
            if (r.local > r.visitante) { h.pg++; h.pts += 3; a.pp++; }
            else if (r.local < r.visitante) { a.pg++; a.pts += 3; h.pp++; }
            else { h.pe++; a.pe++; h.pts++; a.pts++; }
        });

        tabla.forEach(r => { r.dg = r.gf - r.gc; });
        tabla.sort((x, y) => y.pts - x.pts || y.dg - x.dg || y.gf - x.gf || x.equipo.localeCompare(y.equipo));
        return tabla;
    }

    function buildGroupCard(groupId, tabla) {
        const card = document.createElement('div');
        card.className = 'group-card';
        const hayJugados = tabla.some(r => r.pj > 0);
        const rows = tabla.map((r, idx) => `
            <tr class="${hayJugados && idx < 2 ? 'qualifies' : ''}">
                <td class="team">${escapeHtml(r.equipo)}</td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pe}</td>
                <td>${r.pp}</td>
                <td>${r.gf}:${r.gc}</td>
                <td>${r.dg > 0 ? '+' : ''}${r.dg}</td>
                <td class="pts">${r.pts}</td>
            </tr>
        `).join('');

        card.innerHTML = `
            <div class="group-title">Grupo ${groupId}</div>
            <table class="group-table">
                <thead>
                    <tr>
                        <th class="team-col">Equipo</th>
                        <th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF:GC</th><th>DG</th><th>Pts</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
        return card;
    }

    function renderFixture() {
        const cont = document.getElementById('fixture-list');
        cont.innerHTML = '';

        let partidos = state.data.partidos.slice();
        if (state.filtroFase !== 'todos') partidos = partidos.filter(p => p.fase === state.filtroFase);
        if (state.filtroGrupo !== 'todos') partidos = partidos.filter(p => p.grupo === state.filtroGrupo);

        partidos.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

        let lastDay = '';
        partidos.forEach(p => {
            if (p.fecha !== lastDay) {
                lastDay = p.fecha;
                const h = document.createElement('div');
                h.className = 'match-day';
                h.textContent = formatFechaLarga(p.fecha);
                cont.appendChild(h);
            }
            cont.appendChild(buildMatchCard(p));
        });

        if (!partidos.length) {
            cont.innerHTML = '<p style="color:var(--texto-tenue);text-align:center;padding:24px">No hay partidos para el filtro elegido.</p>';
        }
    }

    function buildMatchCard(p) {
        const sede = state.venuesById[p.sede];
        const r = state.results[p.id] || {};
        const card = document.createElement('div');
        card.className = 'match-card' + (r.local != null && r.visitante != null ? ' played' : '');
        const esGrupo = p.fase === 'grupos';
        const stageLabel = p.grupo ? 'Grupo ' + p.grupo : labelFase(p.fase);

        card.innerHTML = `
            <div class="match-meta">
                <span class="stage-tag ${esGrupo ? '' : 'elim'}">${stageLabel}</span>
                <div>${p.hora} hs</div>
            </div>
            <div class="team-side home" title="${escapeHtml(p.local)}">
                <span>${escapeHtml(p.local)}</span>
            </div>
            <div class="score">
                <input type="number" min="0" max="99" placeholder="-"
                    data-match="${p.id}" data-side="local"
                    value="${r.local != null ? r.local : ''}"
                    ${esGrupo ? '' : 'disabled title="Carga manual de eliminatorias deshabilitada por ahora"'} />
                <span class="sep">:</span>
                <input type="number" min="0" max="99" placeholder="-"
                    data-match="${p.id}" data-side="visitante"
                    value="${r.visitante != null ? r.visitante : ''}"
                    ${esGrupo ? '' : 'disabled'} />
            </div>
            <div class="team-side away" title="${escapeHtml(p.visitante)}">
                <span>${escapeHtml(p.visitante)}</span>
            </div>
            <div class="match-venue">
                ${sede ? escapeHtml(sede.nombre) : ''}<br />
                <span style="opacity:.7">${sede ? escapeHtml(sede.ciudad) : ''}</span>
            </div>
        `;

        card.querySelectorAll('input').forEach(inp => {
            inp.addEventListener('change', onScoreChange);
        });
        return card;
    }

    function onScoreChange(e) {
        const id = +e.target.dataset.match;
        const side = e.target.dataset.side;
        const raw = e.target.value.trim();
        if (raw === '') {
            if (state.results[id]) {
                state.results[id][side] = null;
                if (state.results[id].local == null && state.results[id].visitante == null) delete state.results[id];
            }
        } else {
            const n = Math.max(0, Math.min(99, parseInt(raw, 10) || 0));
            e.target.value = n;
            if (!state.results[id]) state.results[id] = { local: null, visitante: null };
            state.results[id][side] = n;
        }
        saveResults();
        renderGroups();
        updateStatus();
    }

    function renderVenues() {
        const cont = document.getElementById('venues-grid');
        cont.innerHTML = '';
        state.data.sedes.forEach(s => {
            const div = document.createElement('div');
            div.className = 'venue-card';
            const photo = s.imagen
                ? `<img src="${escapeAttr(s.imagen)}" alt="${escapeAttr(s.nombre)}" loading="lazy"
                       onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
                   <div class="venue-photo-fallback" style="display:none">${escapeHtml(s.nombre)}</div>`
                : `<div class="venue-photo-fallback" style="display:flex">${escapeHtml(s.nombre)}</div>`;

            div.innerHTML = `
                <div class="venue-photo">
                    ${s.destacado ? `<span class="venue-highlight">${escapeHtml(s.destacado)}</span>` : ''}
                    ${photo}
                </div>
                <div class="venue-body">
                    <div class="venue-name">${escapeHtml(s.nombre)}</div>
                    <div class="venue-city">${escapeHtml(s.ciudad)} · ${escapeHtml(s.pais)}</div>
                    <div class="venue-meta">
                        <span><span class="meta-icon">▸</span> <strong>${s.capacidad.toLocaleString('es-AR')}</strong> espectadores</span>
                        ${s.año ? `<span><span class="meta-icon">▸</span> Inaugurado <strong>${s.año}</strong></span>` : ''}
                    </div>
                    ${s.descripcion ? `<div class="venue-desc">${escapeHtml(s.descripcion)}</div>` : ''}
                    ${s.ciudad_info ? `<div class="venue-ciudad-info">${escapeHtml(s.ciudad_info)}</div>` : ''}
                </div>
            `;
            cont.appendChild(div);
        });
    }

    function renderBracket() {
        const cont = document.getElementById('bracket');
        cont.innerHTML = '';
        const fases = [
            { id: '16avos',  titulo: '16avos de final' },
            { id: 'octavos', titulo: 'Octavos de final' },
            { id: 'cuartos', titulo: 'Cuartos de final' },
            { id: 'semi',    titulo: 'Semifinales' },
            { id: 'tercer',  titulo: 'Tercer puesto' },
            { id: 'final',   titulo: 'Final' },
        ];

        fases.forEach(f => {
            const partidos = state.data.partidos.filter(p => p.fase === f.id);
            if (!partidos.length) return;

            const round = document.createElement('div');
            round.className = 'bracket-round';
            const matches = partidos.map(p => {
                const sede = state.venuesById[p.sede];
                return `
                    <div class="bracket-match">
                        <div class="code">${p.codigo} · ${formatFechaCorta(p.fecha)} · ${p.hora} hs · ${sede ? escapeHtml(sede.ciudad) : ''}</div>
                        <div class="pairing">
                            <span>${escapeHtml(p.local)}</span>
                            <span class="vs">vs</span>
                            <span>${escapeHtml(p.visitante)}</span>
                        </div>
                    </div>
                `;
            }).join('');
            round.innerHTML = `<h3>${f.titulo}</h3><div class="bracket-matches">${matches}</div>`;
            cont.appendChild(round);
        });
    }

    /* ---------- UTILS ---------- */
    function labelFase(f) {
        return ({ '16avos': '16avos', 'octavos': 'Octavos', 'cuartos': 'Cuartos', 'semi': 'Semifinal', 'tercer': '3er Puesto', 'final': 'Final' })[f] || f;
    }

    function formatFechaLarga(iso) {
        const [y, m, d] = iso.split('-');
        const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
        const dt = new Date(+y, +m - 1, +d);
        return `${dias[dt.getDay()]} ${+d} de ${meses[+m - 1]}`;
    }

    function formatFechaCorta(iso) {
        const [, m, d] = iso.split('-');
        return `${+d}/${+m}`;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    }

    function escapeAttr(s) {
        return String(s).replace(/[&"<>']/g, c => ({ '&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;',"'":'&#39;' }[c]));
    }
})();
