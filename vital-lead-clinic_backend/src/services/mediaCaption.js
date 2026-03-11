const buildCaption = (body, templateParameters = []) => {
  if (body) return body;
  if (Array.isArray(templateParameters) && templateParameters.length) {
    return templateParameters.join(' ').trim();
  }
  return null;
};

module.exports = { buildCaption };
