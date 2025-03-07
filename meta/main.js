


let data = [];
let commits = [];
let xScale;
let yScale
let selectedCommits = [];
let commitProgress = 100;
let filteredCommits;
let filteredLines;
let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
let newCommitSlice;

let NUM_ITEMS = 18; // Ideally, let this value be the length of your commit history
let ITEM_HEIGHT = 100; // Feel free to change
let VISIBLE_COUNT = 6; // Feel free to change as well
let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;
const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
spacer.style('height', `${totalHeight}px`);
const itemsContainer = d3.select('#items-container');
scrollContainer.on('scroll', () => {
  const scrollTop = scrollContainer.property('scrollTop');
  let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
  renderItems(startIndex);
});

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line), // or just +row.line
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));

    displayStats();
    renderItems(0);
    displayCommitFiles();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  updateScatterplot(commits);
});

function processCommits() {
    commits = d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        let ret = {
          id: commit,
          url: 'https://github.com/MattTokunaga/portfolio/commit/' + commit,
          author,
          date,
          time,
          timezone,
          datetime,
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
        };
  
        Object.defineProperty(ret, 'lines', {
          value: lines,
          writable: true,
          enumerable: true,
          configurable: true
          // What other options do we need to set?
          // Hint: look up configurable, writable, and enumerable
        });
  
        return ret;
      });
  }

function displayStats() {
  
  // Process commits first
  processCommits();

  // Create the dl element
  d3.select('#stats').select('dl.stats').remove();
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // Add total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>:');
  dl.append('dd').text(filteredCommits?
    filteredCommits.map(commit => commit.totalLines).reduce((total, num) => total + num, 0):
    data.length
  );

  // Add total commits
  dl.append('dt').text('Total commits:');
  dl.append('dd').text(filteredCommits? 
    filteredCommits.length: 
    commits.length);

  // Add more stats as needed...
  // Add longest line
  const longestLine = d3.max(data, (d) => d.length);
  dl.append('dt').text('Longest line:');
  dl.append('dd').text(filteredCommits?
    filteredCommits.length == 0? 0: Math.max(...filteredCommits.flatMap(obj => obj.lines.map(line => line.length))):
    longestLine
  );

  // Add maximum depth
  const maxDepth = d3.max(data, (d) => d.depth);
  dl.append('dt').text('Maximum depth:');
  dl.append('dd').text(maxDepth);

  // Add time of day when most commits are made
  const timeOfDay = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const timeOfDayCounts = [0, 0, 0, 0];

  let filtered_or_nah = filteredCommits? filteredCommits: commits;
  filtered_or_nah.forEach(commit => {
      const hour = commit.datetime.getHours();
      if (hour >= 6 && hour < 12) {
          timeOfDayCounts[0]++;
      } else if (hour >= 12 && hour < 18) {
          timeOfDayCounts[1]++;
      } else if (hour >= 18 && hour < 24) {
          timeOfDayCounts[2]++;
      } else {
          timeOfDayCounts[3]++;
      }
  });

  const maxTimeOfDayIndex = d3.maxIndex(timeOfDayCounts);
  dl.append('dt').text('Most commits made in:');
  dl.append('dd').text(timeOfDay[maxTimeOfDayIndex]);

  // Add day of week when most commits are made
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekCounts = new Array(7).fill(0);

  filtered_or_nah.forEach(commit => {
      const day = commit.datetime.getDay();
      dayOfWeekCounts[day]++;
  });

  const maxDayOfWeekIndex = d3.maxIndex(dayOfWeekCounts);
  dl.append('dt').text('Most commits made on:');
  dl.append('dd').text(daysOfWeek[maxDayOfWeekIndex]);
}

function updateScatterplot(filteredCommits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  d3.select('svg').remove();
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3
    .scaleTime()
    .domain(d3.extent(filteredCommits, (d) => d.datetime))
    .range([0, width])
    .nice();

  yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  svg.selectAll('g').remove();

  const dots = svg.append('g').attr('class', 'dots');

  const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);
  const rScale = d3
    .scaleSqrt() // Change only this line
    .domain([minLines, maxLines])
    .range([10, 30]);

  dots.selectAll('circle').remove();

  dots
    .selectAll('circle')
    .data(filteredCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('fill-opacity', 0.7)
    .attr('fill', 'steelblue')
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      updateTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
      d3.select(event.currentTarget).classed('selected', true);
    })
    .on('mouseleave', () => {
      updateTooltipContent({}); // Clear tooltip content
      updateTooltipVisibility(false);
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      d3.select(event.currentTarget).classed('selected', false);
    });

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };
  
  // Update scales with new ranges
  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

    // Create the axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  // Add gridlines BEFORE the axes
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  // Create gridlines as an axis with no labels and full-width ticks
  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // Add X axis
  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  // Add Y axis
  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  brushSelector();
}

function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const linesEdited = document.getElementById('commit-lines-edited');

  

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.datetime?.toLocaleTimeString('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  author.textContent = commit.author;
  linesEdited.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY - 150}px`;
}

function brushSelector() {
  const svg = document.querySelector('svg');
  // Create brush
  d3.select(svg).call(d3.brush().on('start brush end', brushed));

  // Raise dots and everything after overlay
  d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
}

let brushSelection = null;

function brushed(evt) {
  let brushSelection = evt.selection;
  selectedCommits = !brushSelection
    ? []
    : filteredCommits.filter((commit) => {
        let min = { x: brushSelection[0][0], y: brushSelection[0][1] };
        let max = { x: brushSelection[1][0], y: brushSelection[1][1] };
        let x = xScale(commit.date);
        let y = yScale(commit.hourFrac);

        return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
      });
  updateSelection();
  updateSelectionCount();
  updateLanguageBreakdown();
}

function isCommitSelected(commit) {
  return selectedCommits.includes(commit);
}

function updateSelection() {
  // Update visual state of dots based on selection
  d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d));
}

function updateSelectionCount() {

  const countElement = document.getElementById('selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;

  return selectedCommits;
}   

function updateLanguageBreakdown() {
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }

  return breakdown;
}

function renderItems(startIndex) {
  // Clear things off
  itemsContainer.selectAll('div').remove();
  console.log(commits);
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  let sortedCommits = commits.slice().sort((a, b) => a.datetime - b.datetime);
  newCommitSlice = sortedCommits.slice(startIndex, endIndex);
  filteredCommits = newCommitSlice;
  updateScatterplot(newCommitSlice);
  displayCommitFiles();
  // Re-bind the commit data to the container and represent each using a div
  itemsContainer.selectAll('div')
                .data(sortedCommits)
                .enter()
                .append('div')
                .html((commit, idx) => {
                  return `
                    <p>
                      On ${commit.datetime.toLocaleString("en", {dateStyle: "full", timeStyle: "short"})}, I made
                      <a href="${commit.url}" target="_blank">
                        ${idx > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
                      </a>. I edited ${commit.totalLines} lines across ${d3.rollups(commit.lines, D =>
                        D.length, d => d.file).length} files. Then I looked over all I had made, and I saw that it was very good.
                    </p>
                  `;
                })
                .style('position', 'absolute')
                .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`)
}

function displayCommitFiles() {
  const lines = filteredCommits.flatMap((d) => d.lines);
  let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
  let files = d3.groups(lines, (d) => d.file).map(([name, lines]) => {
    return { name, lines };
  });
  files = d3.sort(files, (d) => -d.lines.length);
  d3.select('.files').selectAll('div').remove();
  let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');
  filesContainer.append('dt').html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
  filesContainer.append('dd')
                .selectAll('div')
                .data(d => d.lines)
                .enter()
                .append('div')
                .attr('class', 'line')
                .style('background', d => fileTypeColors(d.type));
}