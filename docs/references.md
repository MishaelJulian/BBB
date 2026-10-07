# References

Prior work and research sources cited by `BBB_PRD_TRD.md`.

---

## 1. Virtual shelf browsing — prior work

### Harvard Library Innovation Lab — StackView / ShelfLife / StackLife

- Code4Lib 2012 talk, *Stack View: A Library Browsing Tool* (Annie Cain): https://code4lib.org/conference/2012/cain
- StackLife source: https://github.com/harvard-lil/stacklife
- StackView source (jQuery virtual stack plugin): https://github.com/harvard-lil/stackview
- CCA essay, *2011: StackView / ShelfLife*: https://www.cca.qc.ca/en/articles/issues/2/what-the-future-looked-like/1488/2011-stackview-shelflife

Relevance to BBB:

- A virtual shelf drawn with **CSS and JavaScript**, the same family as BBB's CSS 3D approach.
- Spine size is derived from **catalogue data** (dimensions, page count); compare BBB's `page_count` → book thickness.
- A shelf is not limited to one physical order: ShelfLife lets the user **pivot the shelf on any facet** (classification, tags, items browsed together).

### Other

- `petargyurov/virtual-bookshelf`: a minimal HTML/CSS/vanilla-JS bookshelf using CSS transforms to "pick out" a book on hover. Archived at https://archive.org/details/github.com-petargyurov-virtual-bookshelf_-_2022-05-08_14-10-35

## 2. Progressive disclosure

- Shneiderman, B. (1996). *The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations.* IEEE Symposium on Visual Languages. Source of the "overview first, zoom and filter, then details on demand" mantra behind flow D (`BBB_PRD_TRD.md` §9.2).

## 3. ISI — MS in Library and Information Science (MS(LIS))

- ISI postgraduate programmes page: https://dean.isical.ac.in/static/academics/academic_programmes/postgraduate
- DRTC programme page: https://drtc.isibang.ac.in/courses/ms-lis
- Students' brochure, Part II, MS(LIS), effective 2021-22: https://dean.isical.ac.in/isical_web/files/academics/mslis_new.pdf
- Entrance exam syllabus: https://www.isical.ac.in/~admission/IsiAdmission/Syllabus/MS-LIS-2022-Syllabus.pdf

**Where it is taught:** offered **only at Bengaluru**, by the Documentation Research and Training Centre (DRTC), not at Kolkata. DRTC was founded by S. R. Ranganathan in 1962.

**Shape:** 2 years, 4 semesters, 20 credit courses (each 4 hours/week), plus a 4–6 week internship between semesters 2 and 3, and a dissertation across semesters 3–4.

**Courses:**

| Semester | Papers |
|---|---|
| I | 01 Foundations of LIS · 02 Information Organisation · 03 Cataloguing and Metadata · 04 Information Sources, Systems and Services · 05 Foundations of ICT |
| II | 06 Library Management and Automation · 07 Digital Libraries · 08 Knowledge Management · 09 Elements of Mathematics and Statistics · 10 Colloquium and Study of Subject |
| III | 11 Information Retrieval · 12 Content Management Systems · 13 Data Management · 14 Research Methodology and Technical Writing · 15 Seminar |
| IV | 16 Scientometrics and Informetrics · 17 Web Based Information Systems and Services · 18 Semantic Web · 19 Elective · 20 Dissertation |
| Electives | E1 GIS · E2 Health Informatics · E3 Data and Text Mining · E4 Big Data · E5 Data Analytics · E6 Business/Corporate Information Systems |

**Depth in the papers most relevant to BBB** (from the brochure's detailed syllabi):

| Paper | Units relevant to BBB | Applies to |
|---|---|---|
| 01 Foundations of LIS | Ranganathan's *Five Laws of Library Science* | Library Room purpose: every book its reader |
| 02 Information Organisation | General theory of classification; DDC, CC, UDC; Ranganathan's theory (universe of subjects, modes of subject formation); ontologies and folksonomies; knowledge organisation in digital environments | Shelf ordering and facets (StackView-style pivots) |
| 03 Cataloguing and Metadata | Catalogue purpose and forms; metadata types (descriptive, structural, administrative, preservation, **provenance**); Dublin Core / QDC; EAD, TEI, METS, VRA Core | Source → ImportedBook → CanonicalBook provenance layers |
| 07 Digital Libraries | Digitisation and file formats; open standards and interoperability; Dublin Core; OAI-PMH, OAI-ORE, RSS/Atom; persistent identifiers (DOI, handles); digital library architectures | Archive export, stable book IDs |
| 11 Information Retrieval | Subject indexing vs cataloguing and classification; search methodology and algorithms; cognitive IR modelling; NLP; multimedia IR | Search, alphabet navigation, title normalisation |
| 12 Content Management Systems | Content migration; retrieval in CMS; metadata tagging | Admin import and edit flows |
| 13 Data Management | Data curation; OAIS model (SIP / AIP / DIP), ISO 16363, DCC lifecycle; data repositories; Linked Open Data, ontology | Archival preservation and data repair (`docs/book_count&details_issues.md`) |
| 18 Semantic Web | Glossary, taxonomy, thesauri, ontology; knowledge organisation systems (KOS); knowledge representation | Book ↔ member ↔ meetup relationships |

Key texts named in these papers: Ranganathan, *The Five Laws of Library Science* (1988); Ranganathan, *Philosophy of Library Classification* (2006); Ranganathan, *Classified Catalogue Code* (1988); Haynes, *Metadata for Information Management and Retrieval* (2017); Welsh & Batley, *Practical Cataloguing: AACR, RDA and MARC21* (2012); Soergel, *Organizing Information: Principles of Database & Retrieval Systems* (1985).
