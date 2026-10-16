(function () {
  const list = document.querySelector('#job-list');
  if (!list) return;
  const count = document.querySelector('#jobs-count');
  const empty = document.querySelector('#jobs-empty');
  const search = document.querySelector('#job-search');
  const sector = document.querySelector('#job-sector');
  const location = document.querySelector('#job-location');
  const type = document.querySelector('#job-type');
  let jobs = [];
  let loading = false;

  const escapeHtml = function (value) {
    const node = document.createElement('div');
    node.textContent = value || '';
    return node.innerHTML;
  };
  const fillSelect = function (select, values) {
    const current = select.value;
    while (select.options.length > 1) select.remove(1);
    values.filter(Boolean).sort().forEach(function (value) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    if (Array.from(select.options).some(function (option) { return option.value === current; })) {
      select.value = current;
    }
  };
  const render = function () {
    const query = search.value.trim().toLowerCase();
    const visible = jobs.filter(function (job) {
      const haystack = [job.title, job.sector, job.location, job.workplace, job.employmentType, job.salaryDisplay]
        .join(' ')
        .toLowerCase();
      return (!query || haystack.includes(query)) &&
        (!sector.value || job.sector === sector.value) &&
        (!location.value || job.location === location.value) &&
        (!type.value || job.employmentType === type.value);
    });
    list.innerHTML = visible.map(function (job) {
      const metadata = [job.location, job.employmentType, job.workplace, job.salaryDisplay]
        .filter(Boolean)
        .map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; })
        .join('');
      return '<article class="job-card">' +
        '<div><span class="job-card-sector">' + escapeHtml(job.sector) + '</span>' +
        '<h3>' + escapeHtml(job.title) + '</h3>' +
        '<div class="job-meta">' + metadata + '</div></div>' +
        '<span class="job-card-action">View role <span aria-hidden="true">→</span></span>' +
        '<a class="job-card-link" href="' + encodeURI(job.detailUrl) + '" aria-label="View ' + escapeHtml(job.title) + '"></a>' +
        '</article>';
    }).join('');
    count.textContent = visible.length + (visible.length === 1 ? ' vacancy' : ' vacancies');
    empty.hidden = visible.length !== 0;
    list.hidden = visible.length === 0;
  };

  const loadJobs = function () {
    if (loading) return;
    loading = true;
    const dataRequest = window.JobsBoardSource
      ? window.JobsBoardSource.load()
      : Promise.reject(new Error('The live jobs source did not load.'));

    dataRequest.then(function (data) {
      jobs = Array.isArray(data.jobs) ? data.jobs : [];
      fillSelect(sector, Array.from(new Set(jobs.map(function (job) { return job.sector; }))));
      fillSelect(location, Array.from(new Set(jobs.map(function (job) { return job.location; }))));
      fillSelect(type, Array.from(new Set(jobs.map(function (job) { return job.employmentType; }))));
      list.setAttribute('aria-busy', 'false');
      render();
    })
    .catch(function () {
      jobs = [];
      list.setAttribute('aria-busy', 'false');
      count.textContent = 'Vacancies unavailable';
      empty.hidden = false;
      list.hidden = true;
    }).finally(function () {
      loading = false;
    });
  };

  loadJobs();
  window.setInterval(function () {
    if (!document.hidden) loadJobs();
  }, window.JobsBoardSource ? window.JobsBoardSource.refreshMs() : 10000);

  [search, sector, location, type].forEach(function (control) {
    control.addEventListener(control === search ? 'input' : 'change', render);
  });
})();
