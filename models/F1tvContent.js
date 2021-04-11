
class F1tvContent {

  constructor({
    id,
    actions,
    properties,
    metadata: {
      contentId,
      title,
      titleBrief,
      longDescription,
      genres,
      entitlement,
      year,
      episodeNumber,
      duration,
      pictureUrl,
      objectType,
      contentType,
      contentSubtype,
      country,
      language,
      season,
      additionalStreams
    }
  }) {
    return {
      id: contentId || parseInt(id),
      title: title,
      titleBrief: titleBrief || "",
      longDescription: longDescription || "",
      series: (properties || [{ series: null }])[0].series,
      genre: (genres || [null])[0],
      year: year || null,
      season: season || null,
      episodeNumber: episodeNumber || null,
      country: country || null,
      language: language || null,
      pictureUrl: pictureUrl || null,
      tier: entitlement || null,
      duration: duration || null,
      type: contentType || "UNKNOWN",
      subtype: contentSubtype || "UNKNOWN",
      additionalStreams,
      actions: actions || []
    };

  }

}

module.exports = F1tvContent;