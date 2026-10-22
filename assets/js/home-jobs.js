(function () {
  const section = document.querySelector('#vacancies');
  const list = section && section.querySelector('.jobs');
  if (!section || !list || !window.JobsBoardSource) return;

  const escapeHtml = function (value) {
    const node = document.createElement('div');
    node.textContent = value || '';
    return node.innerHTML;
  };

  window.JobsBoardSource.load().then(function (data) {
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    if (!jobs.length) return;

    const heading = section.querySelector('.section-head h2');
    const intro = section.querySelector('.section-head p');
    const note = section.querySelector('.note');
    heading.textContent = 'Current opportunities with Tikpan.';
    intro.textContent = 'Explore our latest vacancies and find a role that matches your experience.';
    list.innerHTML = jobs.slice(0, 3).map(function (job) {
      const metadata = [job.location, job.employmentType, job.workplace, job.salaryDisplay]
        .filter(Boolean)
        .map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; })
        .join('');
      const href = 'vacancies/job.html?job=' + encodeURIComponent(job.slug || job.id || '');
      return '<article class="job-card"><div><span class="job-card-sector">' + escapeHtml(job.sector || 'Vacancy') + '</span>' +
        '<h3>' + escapeHtml(job.title || 'Current vacancy') + '</h3>' +
        '<div class="job-meta">' + metadata + '</div></div>' +
        '<span class="job-card-action">View role</span>' +
        '<a class="job-card-link" href="' + href + '" aria-label="View ' + escapeHtml(job.title || 'current vacancy') + '"></a></article>';
    }).join('');
    note.innerHTML = '<a href="vacancies/index.html">View all vacancies</a>';
    section.hidden = false;
  }).catch(function () {
    section.hidden = true;
  });
})();
