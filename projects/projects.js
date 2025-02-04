
import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

let title = document.querySelector('.projects-title');
title.textContent = projects.length + ' Projects';

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

let rolledData = d3.rollups(
    projects,
    (v) => v.length,
    (d) => d.year
);

let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
});

let sliceGenerator = d3.pie().value((d) => d.value);
let arcData = sliceGenerator(data);
let arcs = arcData.map((d) => arcGenerator(d));
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// arcs.forEach((arc, idx) => {
//     d3.select('svg').append('path').attr("d", arc).attr('fill', colors(idx));
// });

// let legend = d3.select('.legend');
// data.forEach((d, idx) => {
//     legend.append('li')
//           .attr('style', `--color:${colors(idx)}`) // set the style attribute while passing in parameters
//           .html(`<span class="swatch"></span> ${d.label} <em class = "proj-legend">(${d.value})</em>`); // set the inner html of <li>
// })

let query = '';

function setQuery(newQuery) {
    query = newQuery;
    let filteredProjects = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase());
      });
    return filteredProjects;
}

let searchInput = document.getElementsByClassName('searchbar')[0];

// Suppose your searching functionality is completed in event handling
searchInput.addEventListener('input', (event) => {
    let filteredProjects = setQuery(event.target.value);
    renderProjects(filteredProjects, projectsContainer, 'h2');
    // re-calculate rolled data
    let newRolledData = d3.rollups(
      filteredProjects,
      (v) => v.length,
      (d) => d.year,
    );
    // re-calculate data
    let newData = newRolledData.map(([year, count]) => {
      return {value: count, label: year}; // TODO
    });
    // re-calculate slice generator, arc data, arc, etc.
    let newSliceGenerator = d3.pie().value((d) => d.value);
    let newArcData = newSliceGenerator(newData);
    let newArcs = newArcData.map((d) => arcGenerator(d));;
    // TODO: clear up paths and legends
    let newSVG = d3.select('svg'); 
    newSVG.selectAll('path').remove();
    let legend = d3.select('ul.legend');
    legend.selectAll('li').remove();
    // update paths and legends, refer to steps 1.4 and 2.2


    newData.forEach((d, idx) => {
        legend.append('li')
            .attr('style', `--color:${colors(idx)}`) // set the style attribute while passing in parameters
            .html(`<span class="swatch"></span> ${d.label} <em class = "proj-legend">(${d.value})</em>`); // set the inner html of <li>
    })

    // newArcs.forEach((arc, idx) => {
    //     d3.select('svg').append('path').attr("d", arc).attr('fill', colors(idx));
    // });   

    arcs = newArcs;
    embedArcClick(newArcs, filteredProjects, newData);


  });

let selectedIndex = -1;


function embedArcClick(arcsGiven, projectsGiven, dataGiven) {
    let legendNew = document.querySelector('ul.legend');
    legendNew.innerHTML = '';
    let svg = document.querySelector('svg');
    for (let i = 0; i < arcsGiven.length; i++) {
        const svgNS = "http://www.w3.org/2000/svg"; // to create <path> tag in memory
        let path = document.createElementNS(svgNS, "path");
            
        path.setAttribute("d", arcsGiven[i]);
        path.setAttribute("fill", colors(i));
        
        path.addEventListener('click', (event) => {
            // What should we do?
            selectedIndex = selectedIndex === i ? -1 : i;
            // this block helps us update or remove the `selected` class tag from
            // the wedge
            document.querySelectorAll('path').forEach((p, i) => { // path, index
                if (i === selectedIndex) {
                    p.classList.add('selected');
                } else {
                    p.classList.remove('selected');
                }
            })
            if (selectedIndex !== -1) {
                // retrieve the selected year
                let selectedYear = dataGiven[selectedIndex].label
                // filter projects based on the year
                let filteredProjects = projectsGiven.filter(project => project.year === selectedYear);
                // TODO: render filtered projects
                renderProjects(filteredProjects, document.querySelector('div.projects'));
                // TODO: call the recalculate function with filtered projects
                let newData = recalculate(filteredProjects);
                // TODO: Clear out the legend first, refer to step 4.4 Tip
                let newLegend = d3.select('ul.legend');
                newLegend.selectAll('li').remove();
                // update new legend using the highlight color
                newData.forEach((d) => {
                    newLegend.append('li').attr('style', "--color: var(--color-accent)").html(`<span class="swatch"></span> ${d.label} <em class = "proj-legend">(${d.value})</em>`);
                });
            } else {
                // TODO: render projects directly
                renderProjects(projectsGiven, document.querySelector('div.projects'));
                  
                // TODO: call the recalculate function with projects
                let newData = recalculate(projectsGiven);
                // Clear out the legend first, refer to step 4.4 Tip
                let newLegend = d3.select('ul.legend');
                newLegend.selectAll('li').remove();
                // update new legend using our normal color scheme
                newData.forEach((d, idx) => {
                    newLegend.append('li').attr('style', `--color:${colors(idx)}`).html(`<span class="swatch"></span>${d.label} <em class = "proj-legend">(${d.value})</em>`);
                });
            }
        })
    
        let li = document.createElement('li');
        li.style.setProperty('--color', colors(i));
        
        // Create the swatch span
        let swatch = document.createElement('span');
        swatch.className = 'swatch';
        swatch.style.backgroundColor = colors(i);
            
            // Append the swatch to the list item
        li.appendChild(swatch);
        
            // Set the label and value
        li.innerHTML += `${dataGiven[i].label} <em class="proj-legend">(${dataGiven[i].value})</em>`;
        
        legendNew.appendChild(li);
        svg.appendChild(path);    
    }
}


function recalculate(projectsGiven) {
    let newRolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year,
    );
    let newData = newRolledData.map(([year, count]) => {
        return { value: count, label: year };
    });
    return newData;
}

embedArcClick(arcs, projects, data);