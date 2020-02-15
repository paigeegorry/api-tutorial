const { parse } = require('node-html-parser');
const request = require('superagent');
const lodash = require('lodash');
const nameScraper = require('./nameScraper')

const removeSymbol = arr => arr.map(str => str.replace(' †', ''))
const removeHtmlTags = str => str.replace('<small>', '').replace('</small>', '').replace('<p>', '').replace('</p>', '')

const reformatData = ({ labels, values, photoInfo, name }) => {
  const obj = {};
  obj.photo = photoInfo;
  obj.name = name;
  
  labels.map((l, i) => {
    console.log(values[i].text)
    const label = lodash.camelCase(l)
    const value = values[i].text
    const htmlVal = values[i].innerHTML
    if(label === 'appearsInEpisodes') {
      let newVal = value.trim().split(' ')
      obj[label] = newVal.length > 0 ? newVal : newVal[0]
    }
    else if(htmlVal.includes('<br />')) {
      if(label === 'affiliation') {
        let newVal = htmlVal.split('>').map(str => str.trim())
          .filter(str => str[0] !== '<' && str[0] !== '/' && str.length > 0 && !str.includes('(formerly)'))
          .map(str => str.replace('</a', '').replace('</small', ''))
        newVal = newVal.map(str => {
          if(str.includes('<a href')) return
          else return str
        })
        obj[label] = newVal.filter(s => s)
      }
      else if(!htmlVal.includes('<a href')) {
        const newVal = htmlVal.split('<br />')
          .filter(s => s).map(s => removeHtmlTags(s))
        obj[label] = removeSymbol(newVal)
      }
    }
    else if(value.includes(')') && label !== 'height') {
      let newVal = value.split(')').map(s => s.length > 0 ? (s + ')').trim() : undefined).filter(s => s && s !== ')')
      if(label === 'residence') {
        newVal = newVal.map(s => s.replace(': ', '').trim())
      }
      newVal = removeSymbol(newVal)
      obj[label] = newVal.length === 1 ? newVal[0] : newVal
    }
    else {
      obj[label] = value
    }
  });

  return obj;
};

const infoScraper = async() => {
  // const names = await nameScraper()
  const names = ['Tom Holloway']

  try {
    return Promise.all(
      names.map(name => {
        return request.get(`https://strangerthings.fandom.com/wiki/${name}`)
        .then(res => res.text)
        .then(parse)
        .then(html => {
          const labels = html.querySelectorAll('.pi-data-label').map(l => l.structuredText);
          const values = html.querySelectorAll('div .pi-data-value');
          const photoInfo = html.querySelectorAll('.pi-image-thumbnail').length ? html.querySelectorAll('.pi-image-thumbnail')[0].rawAttrs.split('"')[1] : 'https://pbs.twimg.com/profile_images/514121481702227968/XxIE7ASP_400x400.jpeg';
          return { labels, values, photoInfo, name };
        })
        .then(reformatData)
        .then(console.log)
        .catch(err => console.log({err, name}));
      }))
    }
  catch(err) {
    console.error(err);
  }
};

infoScraper()