(() => {
  const XHR = ('onload' in new XMLHttpRequest()) ? XMLHttpRequest : XDomainRequest;
  const xhr = new XHR();
  xhr.open('GET', window.location, true);
  xhr.send();
  xhr.onload = () => {
    let code = xhr.responseText;
    if (!code) {
      alert('Не удалось получить код страницы.');
      return;
    }
    const parser = new DOMParser();
    code = parser.parseFromString(code, 'text/html');
    const script = code.querySelectorAll('script');
    function filterNone() {
      return NodeFilter.FILTER_ACCEPT;
    }
    const codeBody = code.getElementsByTagName('body')[0];
    if (!codeBody) {
      alert('Не удалось проверить из-за ошибок в HTML коде. Проверьте код страницы на валидность.');
      return;
    }

    // функция для удаления в строке двойных пробелов
    function dsr(str) {
      let returnStr = str;
      while (returnStr.indexOf('  ') + 1) {
        returnStr = returnStr.replace(/ {2}/g, ' ');
      }
      return returnStr;
    }

    let bodyText = codeBody.innerText.replace(/[\r\n\t]/gi, ' ');
    bodyText = dsr(bodyText);
    const comment = [];
    const iterator = document.createNodeIterator(code, NodeFilter.SHOW_COMMENT, filterNone, false);
    let curNode;
    while ((curNode = iterator.nextNode())) {
      comment.push(curNode.nodeValue);
    }
    let h = codeBody.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (!h) h = [];
    const hd = [];
    for (let i = 0; i < h.length; i += 1) {
      hd[i] = [];
      hd[i].head = Number(h[i].localName[1]);
      hd[i].text = h[i].textContent;
    }


    const tempHeaders = [];
    let hErr = false;
    for (let i = 0; i < hd.length; i += 1) {
      if (i === 0) {
        if (hd[0].head !== 1) {
          hd[0].error = 'Первый заголовок не h1';
          tempHeaders[hd[0].head] = true;
          hErr = true;
          continue;
        }
      }

      if (hd[i].head === 1 && tempHeaders[1]) {
        hd[i].error += 'Более одного заголовка H1. ';
      }

      if (hd[i].head === 1 && (tempHeaders[2] || tempHeaders[3] || tempHeaders[4] || tempHeaders[5] || tempHeaders[6])) {
        hd[i].error += 'Не первый заголовок в иерархии.';
      }

      if (hd[i].head !== 1 && !tempHeaders[hd[i].head - 1]) {
        hd[i].error += 'Перед заголовком не было заголовка уровнем выше. ';
      }

      if (hd[i - 1] && (hd[i].head - hd[i - 1].head > 1)) {
        hd[i].error += 'Нарушает иерархию заголовков. ';
      }

      if (hd[i].text.replace(/ |\s|&nbsp;/gi, '') === '') {
        hd[i].error += 'Пустой заголовок.';
      }
      tempHeaders[hd[i].head] = true;
      if (hd[i].error) {
        hd[i].error = hd[i].error.replace('undefined', '');
        hErr = true;
      }
    }

    let alertStr = '';
    let openLinks = '';
    let descr = code.querySelector('meta[name=description]') || document.querySelector('meta[name=description]');
    let keyw = code.querySelector('meta[name=keywords]') || document.querySelector('meta[name=keywords]');
    const meta = code.querySelectorAll('meta') || document.querySelectorAll('meta');
    const bcnt = codeBody.querySelectorAll('b');
    const strong = codeBody.querySelectorAll('strong');
    const em = codeBody.querySelectorAll('em');
    const links = codeBody.querySelectorAll('a');
    let externalLinks = '';
    let externalLinksCnt = 0;
    let internalLinks = '';
    let internalLinksCnt = 0;
    const img = codeBody.querySelectorAll('img');
    const titleAttr = codeBody.querySelectorAll('body [title]');
    let altTitle = '';
    let altCnt = 0;
    let altStrCnt = 0;
    let h16Str = '';
    let canonical = code.querySelector('link[rel=canonical]') || document.querySelector('head link[rel=canonical]');
    let rnext = code.querySelector('link[rel=next]') || document.querySelector('link[rel=next]');
    let rprev = code.querySelector('link[rel=prev]') || document.querySelector('link[rel=prev]');
    const title = code.querySelector('title') || document.querySelector('title');
    let codeScriptsDel = '';
    // на https://paybis.com/ не работает title и description
    // цикл виснет. Нужно не удалять src и href

    codeScriptsDel = code.getElementsByTagName('body')[0].cloneNode(true);

    function codeClear(element) {
      const allTags = element.children;
      const allTagsLen = allTags.length;
      for (let i = 0; i < allTagsLen; i += 1) {
        if (allTags[i].nodeType !== 1) continue;
        if (['script', 'style', 'noscript'].indexOf(allTags[i].nodeName.toLowerCase()) !== -1) {
          allTags[i].innerHTML = '';
          continue;
        }
        const tagAttr = allTags[i].attributes;
        const attLent = tagAttr.length;
        if (attLent > 0) {
          for (let a = 0; a < attLent; a++) {
            // debugger;
            if (!tagAttr[a]) break;
            if (tagAttr[a].name === 'src' || tagAttr[a].name === 'href') continue;
            allTags[i].removeAttribute(tagAttr[a].name);
            a--;
          }
        }
        if (allTags[i].childNodes.length > 0) {
          allTags[i] = codeClear(allTags[i]);
        }
        element[i] = allTags[i];
        continue;
      }
      return element;
    }
    codeScriptsDel = codeClear(codeScriptsDel);

    for (let i = 0; i < meta.length; i += 1) {
      if (meta[i].name.toLowerCase() === 'description') descr = meta[i];
      if (meta[i].name.toLowerCase() === 'keywords') keyw = meta[i];
    }

    if (title) {
      alertStr += `<p><b class="link_sim"  title="Скопировать title в буфер обмена">Title</b> <span ${(title.textContent.length < 30 || title.textContent.length > 150) ? "class='red'" : ''}>(${title.textContent.length}): </span>${title.textContent}</p>`;
    } else {
      alertStr += '<p><b class="red">Title: отсутствует</b></p>';
    }

    if (descr) {
      descr = descr.content;
      if (descr) {
        alertStr += `<p><b class="link_sim" title="Скопировать description в буфер обмена">Description</b> <span ${(descr.length < 50 || descr.length > 250) ? "class='red'" : ''}>(${descr.length}): </span>${descr}</p>`;
      } else {
        alertStr += '<p><b class="red">Description: отсутствует</b></p>';
      }
    } else {
      alertStr += '<p><b class="red">Description: отсутствует</b></p>';
    }

    if (keyw) {
      keyw = keyw.content;
      if (keyw) {
        alertStr += `<p><b>Keywords</b> (${keyw.length}): ${keyw}</p>`;
      }
    }

    for (let i = 0; i < meta.length; i += 1) {
      if (meta[i].name.toLowerCase() === 'robots' || meta[i].name.toLowerCase() === 'yandex' || meta[i].name.toLowerCase() === 'googlebot') {
        alertStr += `<p><b>meta ${meta[i].name}:</b> ${(meta[i].content.indexOf('noindex') + 1 || meta[i].content.indexOf('nofollow') + 1) ? `<b class='red'>${meta[i].content}</b>` : meta[i].content}</p>`;
      }
    }

    if (canonical) {
      canonical = canonical.getAttribute('href');
      if (canonical) {
        alertStr += `<p><b>Canonical:</b> ${(canonical === location.href) ? `<a href='${canonical}'>${canonical}</a>` : `<a href='${canonical}'><b class='red'>${canonical}</b></a>`}</p>`;
      }
    }

    if (rnext) {
      rnext = rnext.href;
      if (rnext) {
        alertStr += `<p><b>rel=next: </b><a href="${rnext}">${rnext}</a></p>`;
      }
    }

    if (rprev) {
      rprev = rprev.href;
      if (rprev) {
        alertStr += `<p><b>rel=prev: </b><a href="${rprev}">${rprev}</a></p>`;
      }
    }

    if (bcnt && bcnt.length > 0) {
      alertStr += `<p><b>b count:</b> ${bcnt.length}</p>`;
    }

    if (strong && strong.length > 0) {
      alertStr += `<p><b>strong count:</b> ${strong.length}</p>`;
    }

    if (em && em.length > 0) {
      alertStr += `<p><b>em count:</b> ${em.length}</p>`;
    }

    if (comment && comment.length > 0) {
      let commentLen = 0;
      let maxCommentLen = 0;
      for (let i = 0; i < comment.length; i += 1) {
        commentLen += comment[i].length;
        if (comment[i].length - 7 > maxCommentLen) {
          maxCommentLen = comment[i].length - 7;
        }
      }
      alertStr += `<p><b>HTML комментарии:</b> <span title="Количество HTML комментариев">${comment.length}</span> | <span title="Объем HTML комментариев (символов)">${commentLen}</span> | <span title="Длинна наибольшего комментария">${maxCommentLen}</span></p>`;
    }

    if (script && script.length > 0) {
      let scriptLen = 0;
      for (let i = 0; i < script.length; i += 1) {
        scriptLen += script[i].textContent.length;
      }
      alertStr += `<p><b>JS скрипты:</b> <span title="Количество внутренних JS">${script.length}</span> | <span title="Объем JS кода (символов)">${scriptLen}</span></p>`;
    }

    const linksTempArr = [];
    let l = '';
    let lh = '';
    for (let i = 0; i < links.length; i += 1) {
      lh = links[i].href.split('#')[0];
      if (linksTempArr[lh]) continue;
      try {
        l = decodeURIComponent(lh);
      } catch (e) {
        l = lh;
      }
      if (location.hostname === links[i].hostname) {
        internalLinksCnt += 1;
        linksTempArr[lh] = true;
        internalLinks += `<li><a href="${lh}" target="_blank">${l}</a>${(links[i].rel.indexOf('nofollow') + 1) ? '&nbsp;&nbsp; — &nbsp;&nbsp;<b style="text-decoration:underline;">nofollow</b>' : ''}</li>`;
      } else if (lh.substr(0, 4) === 'http') {
        externalLinksCnt += 1;
        linksTempArr[lh] = true;
        externalLinks += `<li><a href="${lh}" target="_blank">${l}</a>${(links[i].rel.indexOf('nofollow') + 1) ? '&nbsp;&nbsp; — &nbsp;&nbsp;<b style="text-decoration:underline;">nofollow</b>' : ''}</li>`;
      }
    }

    for (let i = 0; i < img.length; i += 1) {
      if (img[i].alt && img[i].alt !== '') {
        altCnt += 1;
        altStrCnt += img[i].alt.length;
        altTitle += `<li><b>alt</b> — ${img[i].alt}</li>`;
      }
    }

    for (let i = 0; i < titleAttr.length; i += 1) {
      if (titleAttr[i].title && titleAttr[i].title !== '') {
        altCnt += 1;
        altStrCnt += titleAttr[i].title.length;
        altTitle += `<li><b>title</b> — ${titleAttr[i].title}</li>`;
      }
    }
    alertStr += `<p><b>alt + title:</b> <span title="Объем атрибутов a[alt] title (символов)">${altStrCnt}</span></p>`;
    alertStr += `<p><b>Объем текста:</b> <span title="Символов без пробелов">${bodyText.replace(/\s/gi, '').length}</span> | <span title="Символов с пробелами">${bodyText.length}</span></p>`;


    for (let i = 0; i < hd.length; i += 1) {
      h16Str += `<li style="margin-left:${(hd[i].head - 1) * 20}px"${(hd[i].error) ? ` class="red" title="${hd[i].error}"` : ''}><span>H${hd[i].head} - ${hd[i].text}</span></li>`;
    }

    openLinks += '<p>';
    openLinks += `<b class="openLinksB" data="pxexternallinks">External Links (${externalLinksCnt})</b>&nbsp;&nbsp;|&nbsp;&nbsp;`;
    openLinks += `<b class="openLinksB" data="pxinternallinks">Internal Links (${internalLinksCnt})</b>&nbsp;&nbsp;|&nbsp;&nbsp;`;
    openLinks += `<b class="openLinksB" data="pxalttitlelinks">Img alt/title (${altCnt})</b>&nbsp;&nbsp;|&nbsp;&nbsp;`;
    openLinks += `<b class="openLinksB" data="pxh16links">H1-H6 ${(hErr) ? `<span class="red">(${hd.length})` : `(${hd.length})`}</b>&nbsp;&nbsp;|&nbsp;&nbsp;`;
    openLinks += '<b class="openLinksB" data="pxtext">Текст</b>';
    openLinks += '</p>';

    const topBS = document.createElement('style');
    topBS.setAttribute('type', 'text/css');
    topBS.innerHTML = '.pixelTopBlockWrp{position:relative;width:100%;top:0;left:0;background:#f8f8f8;z-index:999999;text-align:left;border-bottom:1px solid #9D9DA1;color:#000;font-family:arial;max-height:50%;overflow-y:auto;}.pixelTopBlockWrp .close {float:right;cursor:pointer;color:#000;font-size: 24px;line-height: 0;padding: 8px 0 0;}.topBlock{padding:5px 10px;font-size:14px;line-height: 16px;}.topBlock p{margin:0 0 0.3em 0 !important; padding:0px; line-height: 1.2em;font-size:14px;}.pxtblocklinks OL{margin:0px 15px;padding:0 0 0 40px;list-style:decimal;display:none;}.pxtblocklinks OL LI {color: #000;margin-bottom: 3px;display:block;font-size:14px;}.pxtblocklinks {width:70%;left:15%;position:relative;background:#fff;z-index:99999;box-shadow:0 3px 10px #000;font-size:14px;word-wrap: break-word;}.pxexternallinks, .pxinternallinks, .pxalttitlelinks, .pxh16links{margin:0px 15px;padding: 0 0 0 20px;list-style:decimal;display:none;height:500px;overflow:auto;} .pxh16links span:hover {cursor:pointer;border-bottom:1px solid;}.openLinksB{border-bottom:1px dashed #000;cursor:pointer;} .openLinksB:hover {border-bottom: none;} .pixelTopBlockWrp b, p{color:#000;}.pxtblocklinks a{color:#000;text-decoration:none;} .pxtblocklinks a:hover{border-bottom:1px solid;}.pixelTopBlockWrp b{font-weight:bold;}.topBlock .red, .pxtblocklinks .red {color:red;} .link_sim{text-decoration:underline;} .link_sim:hover{cursor:pointer; text-decoration:none;color:blue;} .topBlock a{color:black;} .pxtext{margin:0px 15px;padding: 0 20px 0 20px !important;display:none;height:500px;overflow:auto;} .pxtext a {color:#0000ee;}';
    document.getElementsByTagName('body')[0].appendChild(topBS);
    const topBlock = document.createElement('div');
    topBlock.className = 'pixelTopBlockWrp';
    topBlock.innerHTML = `<div class="topBlock"><b class="close">\u00d7</b>${alertStr}${openLinks}</div>`;
    const first = document.getElementsByTagName('body')[0].childNodes[0];

    const linksData = document.createElement('div');
    linksData.className = 'pxtblocklinks';
    linksData.innerHTML = `<ol class="pxexternallinks">${externalLinks}</ol><ol class="pxinternallinks">${internalLinks}</ol><ol class="pxalttitlelinks">${altTitle}</ol><ol class="pxh16links" style="list-style:none;">${h16Str}</ol><ol class="pxtext">${codeScriptsDel.innerHTML}</ol>`;
    const block = document.createElement('div');
    block.style = 'position:fixed;z-index:9999999999999;width:100%;top:0px;left:0px;';
    block.className = 'pxtblock pxtagblock';
    block.appendChild(topBlock);
    block.appendChild(linksData);
    document.getElementsByTagName('body')[0].insertBefore(block, first);

    document.querySelector('div.pxtagblock b.close').onclick = () => {
      const pxtblock = document.querySelector('div.pxtagblock');
      document.getElementsByTagName('body')[0].removeChild(pxtblock);
    };

    const copyLink = document.querySelectorAll('b.link_sim');
    for (let i = 0; i < copyLink.length; i += 1) {
      copyLink[i].onclick = (e) => {
        const ta = document.createElement('textarea');
        const body = document.querySelector('body');
        body.appendChild(ta);
        ta.innerHTML = e.target.parentNode.lastChild.nodeValue;
        ta.select();
        document.execCommand('copy');
        body.removeChild(ta);
      };
    }


    const openLinksBlocks = document.querySelectorAll('div.pxtagblock b.openLinksB');
    const pxtblocklinks = document.querySelectorAll('div.pxtblocklinks ol');
    for (let i = 0; i < openLinksBlocks.length; i += 1) {
      openLinksBlocks[i].onclick = (e) => {
        for (let k = 0; k < pxtblocklinks.length; k += 1) {
          const currentBlock = pxtblocklinks[k];
          if (e.target.getAttribute('data') !== currentBlock.className) {
            currentBlock.classList.remove('active');
            currentBlock.style.display = 'none';
          } else {
            if (currentBlock.classList.contains('active')) {
              currentBlock.classList.remove('active');
              currentBlock.style.display = 'none';
            } else {
              currentBlock.classList.add('active');
              currentBlock.style.display = 'block';
            }
          }
        }
      };
    }
  };
})();
