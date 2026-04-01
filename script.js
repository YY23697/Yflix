const API_KEY = "984fa8ab0d7f1d932161fbb4383cdd58";
const API_URL = "https://api.themoviedb.org/3/movie/popular";
const TV_API_URL = "https://api.themoviedb.org/3/tv/popular";
const SEARCH_API_URL = "https://api.themoviedb.org/3/search/movie";
const MOVIE_VIDEO_API_BASE_URL = "https://api.themoviedb.org/3/movie";
const TV_VIDEO_API_BASE_URL = "https://api.themoviedb.org/3/tv";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const PAGE_SIZE = 10;
const FETCH_PAGES = 5;
const SEARCH_FETCH_PAGES = 3;
const TV_TOP_COUNT = 20;

const movieGrid = document.getElementById("movieGrid");
const tvGrid = document.getElementById("tvGrid");
const movieCardTemplate = document.getElementById("movieCardTemplate");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const tvPrevButton = document.getElementById("tvPrevButton");
const tvNextButton = document.getElementById("tvNextButton");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const sectionTitle = document.getElementById("sectionTitle");
const homeLink = document.getElementById("homeLink");
const movieModal = document.getElementById("movieModal");
const movieModalBackdrop = document.getElementById("movieModalBackdrop");
const movieModalClose = document.getElementById("movieModalClose");
const movieModalMedia = document.getElementById("movieModalMedia");
const movieModalTitle = document.getElementById("movieModalTitle");
const movieModalMeta = document.getElementById("movieModalMeta");
const movieModalGenres = document.getElementById("movieModalGenres");
const movieModalOverview = document.getElementById("movieModalOverview");

let allMovies = [];
let currentPage = 0;
let isSearchMode = false;
const trailerKeyCache = new Map();
const movieDetailsCache = new Map();
const movieImagesCache = new Map();
const tvTrailerKeyCache = new Map();
const tvDetailsCache = new Map();

let allTvShows = [];
let tvCurrentPage = 0;

async function fetchPopularMovies() {
  const requests = Array.from({ length: FETCH_PAGES }, (_, index) => {
    const page = index + 1;
    const requestUrl = `${API_URL}?api_key=${API_KEY}&language=ko-KR&page=${page}`;
    return fetch(requestUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }
      return response.json();
    });
  });

  const pages = await Promise.all(requests);
  return pages.flatMap((pageData) => pageData.results || []);
}

async function fetchPopularTv() {
  const requestUrl = `${TV_API_URL}?api_key=${API_KEY}&language=ko-KR&page=1`;
  const response = await fetch(requestUrl);
  if (!response.ok) {
    throw new Error(`TV API 요청 실패: ${response.status}`);
  }
  const data = await response.json();
  return (data.results || []).slice(0, TV_TOP_COUNT);
}

async function searchMovies(query) {
  const requests = Array.from({ length: SEARCH_FETCH_PAGES }, (_, index) => {
    const page = index + 1;
    const requestUrl = `${SEARCH_API_URL}?api_key=${API_KEY}&language=ko-KR&page=${page}&query=${encodeURIComponent(query)}`;
    return fetch(requestUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`검색 API 요청 실패: ${response.status}`);
      }
      return response.json();
    });
  });

  const pages = await Promise.all(requests);
  return pages.flatMap((pageData) => pageData.results || []);
}

async function fetchMovieTrailerKey(movieId) {
  if (trailerKeyCache.has(movieId)) {
    return trailerKeyCache.get(movieId);
  }

  const languages = ["ko-KR", "en-US", ""];
  let key = null;

  for (const language of languages) {
    const langQuery = language ? `&language=${language}` : "";
    const requestUrl = `${MOVIE_VIDEO_API_BASE_URL}/${movieId}/videos?api_key=${API_KEY}${langQuery}`;
    const response = await fetch(requestUrl);
    if (!response.ok) {
      throw new Error(`예고편 API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];
    const trailer =
      results.find((video) => video.site === "YouTube" && video.type === "Trailer" && video.official) ||
      results.find((video) => video.site === "YouTube" && video.type === "Trailer") ||
      results.find((video) => video.site === "YouTube" && video.type === "Teaser");

    if (trailer?.key) {
      key = trailer.key;
      break;
    }
  }

  trailerKeyCache.set(movieId, key);
  return key;
}

async function fetchTvTrailerKey(seriesId) {
  if (tvTrailerKeyCache.has(seriesId)) {
    return tvTrailerKeyCache.get(seriesId);
  }

  const languages = ["ko-KR", "en-US", ""];
  let key = null;

  for (const language of languages) {
    const langQuery = language ? `&language=${language}` : "";
    const requestUrl = `${TV_VIDEO_API_BASE_URL}/${seriesId}/videos?api_key=${API_KEY}${langQuery}`;
    const response = await fetch(requestUrl);
    if (!response.ok) {
      throw new Error(`TV 예고편 API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];
    const trailer =
      results.find((video) => video.site === "YouTube" && video.type === "Trailer" && video.official) ||
      results.find((video) => video.site === "YouTube" && video.type === "Trailer") ||
      results.find((video) => video.site === "YouTube" && video.type === "Teaser");

    if (trailer?.key) {
      key = trailer.key;
      break;
    }
  }

  tvTrailerKeyCache.set(seriesId, key);
  return key;
}

async function fetchMovieDetails(movieId) {
  if (movieDetailsCache.has(movieId)) {
    return movieDetailsCache.get(movieId);
  }
  const requestUrl = `${MOVIE_VIDEO_API_BASE_URL}/${movieId}?api_key=${API_KEY}&language=ko-KR`;
  const response = await fetch(requestUrl);
  if (!response.ok) {
    throw new Error(`영화 상세 API 요청 실패: ${response.status}`);
  }
  const data = await response.json();
  movieDetailsCache.set(movieId, data);
  return data;
}

async function fetchMovieImages(movieId) {
  if (movieImagesCache.has(movieId)) {
    return movieImagesCache.get(movieId);
  }
  const requestUrl = `${MOVIE_VIDEO_API_BASE_URL}/${movieId}/images?api_key=${API_KEY}&include_image_language=ko,null,en`;
  const response = await fetch(requestUrl);
  if (!response.ok) {
    throw new Error(`영화 이미지 API 요청 실패: ${response.status}`);
  }
  const data = await response.json();
  movieImagesCache.set(movieId, data);
  return data;
}

async function fetchTvDetails(seriesId) {
  if (tvDetailsCache.has(seriesId)) {
    return tvDetailsCache.get(seriesId);
  }
  const requestUrl = `${TV_VIDEO_API_BASE_URL}/${seriesId}?api_key=${API_KEY}&language=ko-KR`;
  const response = await fetch(requestUrl);
  if (!response.ok) {
    throw new Error(`TV 상세 API 요청 실패: ${response.status}`);
  }
  const data = await response.json();
  tvDetailsCache.set(seriesId, data);
  return data;
}

function closeMovieModal() {
  movieModal.classList.remove("is-open");
  movieModal.setAttribute("aria-hidden", "true");
  movieModalMedia.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function openMovieModalContent({ details, images, trailerKey }) {
  movieModalTitle.textContent = details.title || "제목 없음";
  movieModalMeta.textContent = `${details.release_date || "개봉일 미정"} · 평점 ${Number(details.vote_average || 0).toFixed(1)} · ${details.runtime || "-"}분`;
  movieModalGenres.textContent = (details.genres || []).map((genre) => genre.name).join(" · ") || "장르 정보 없음";
  movieModalOverview.textContent = details.overview || "줄거리 정보가 없습니다.";

  const backdropPath = images?.backdrops?.[0]?.file_path || details.backdrop_path || details.poster_path;
  if (trailerKey) {
    movieModalMedia.innerHTML = `<iframe src="https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=1&rel=0" title="영화 예고편" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  } else if (backdropPath) {
    movieModalMedia.innerHTML = `<img src="${IMAGE_BASE_URL}${backdropPath}" alt="${details.title || "영화"} 이미지" />`;
  } else {
    movieModalMedia.innerHTML = `<div class="state-message">예고편/이미지 정보가 없습니다.</div>`;
  }

  movieModal.classList.add("is-open");
  movieModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function openTvModalContent({ details, trailerKey }) {
  movieModalTitle.textContent = details.name || "제목 없음";
  movieModalMeta.textContent = `${details.first_air_date || "방영일 미정"} · 평점 ${Number(details.vote_average || 0).toFixed(1)} · 시즌 ${details.number_of_seasons || "-"}`;
  movieModalGenres.textContent = (details.genres || []).map((genre) => genre.name).join(" · ") || "장르 정보 없음";
  movieModalOverview.textContent = details.overview || "줄거리 정보가 없습니다.";

  const backdropPath = details.backdrop_path || details.poster_path;
  if (trailerKey) {
    movieModalMedia.innerHTML = `<iframe src="https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=1&rel=0" title="TV 예고편" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  } else if (backdropPath) {
    movieModalMedia.innerHTML = `<img src="${IMAGE_BASE_URL}${backdropPath}" alt="${details.name || "TV 시리즈"} 이미지" />`;
  } else {
    movieModalMedia.innerHTML = `<div class="state-message">영상/이미지 정보가 없습니다.</div>`;
  }

  movieModal.classList.add("is-open");
  movieModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function stopTrailerPreview(card) {
  if (card.previewTimer) {
    clearTimeout(card.previewTimer);
    card.previewTimer = null;
  }
}

function setupMoviePreview(card, movieId) {
  card.addEventListener("mouseenter", () => {
    stopTrailerPreview(card);
    card.previewTimer = setTimeout(async () => {
      try {
        if (!card.matches(":hover")) return;
        const [details, images, trailerKey] = await Promise.all([
          fetchMovieDetails(movieId),
          fetchMovieImages(movieId),
          fetchMovieTrailerKey(movieId),
        ]);
        if (!card.matches(":hover")) return;
        openMovieModalContent({ details, images, trailerKey });
      } catch (error) {
        console.error(error);
      }
    }, 1000);
  });

  card.addEventListener("mouseleave", () => {
    stopTrailerPreview(card);
  });
}

function setupTvPreview(card, seriesId) {
  card.addEventListener("mouseenter", () => {
    stopTrailerPreview(card);
    card.previewTimer = setTimeout(async () => {
      try {
        if (!card.matches(":hover")) return;
        const [details, trailerKey] = await Promise.all([fetchTvDetails(seriesId), fetchTvTrailerKey(seriesId)]);
        if (!card.matches(":hover")) return;
        openTvModalContent({ details, trailerKey });
      } catch (error) {
        console.error(error);
      }
    }, 1000);
  });

  card.addEventListener("mouseleave", () => {
    stopTrailerPreview(card);
  });
}

function setupModal() {
  movieModalClose.addEventListener("click", closeMovieModal);
  movieModalBackdrop.addEventListener("click", closeMovieModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && movieModal.classList.contains("is-open")) {
      closeMovieModal();
    }
  });
}

function renderStateMessage(grid, message, isError = false) {
  grid.innerHTML = `<p class="state-message ${isError ? "error" : ""}">${message}</p>`;
}

function renderPosterGrid(grid, items, startRank, options = {}) {
  const { isSearchMode = false, nameKey = "title", enableMoviePreview = false, enableTvPreview = false } = options;
  grid.innerHTML = "";
  grid.classList.toggle("search-mode", isSearchMode);

  items.forEach((item, index) => {
    const card = movieCardTemplate.content.firstElementChild.cloneNode(true);
    const rank = card.querySelector(".rank-badge");
    const poster = card.querySelector(".movie-poster");
    const displayName = item[nameKey] || item.title || item.name || "";

    rank.textContent = startRank + index + 1;

    if (item.poster_path) {
      poster.src = `${IMAGE_BASE_URL}${item.poster_path}`;
      poster.alt = `${displayName} 포스터`;
    } else {
      poster.alt = `${displayName} 포스터 없음`;
      poster.style.objectFit = "contain";
      poster.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750'%3E%3Crect width='100%25' height='100%25' fill='%23202945'/%3E%3Ctext x='50%25' y='50%25' fill='%23b7bfd6' font-size='28' text-anchor='middle' dominant-baseline='middle'%3ENo Poster%3C/text%3E%3C/svg%3E";
    }

    grid.appendChild(card);

    if (enableMoviePreview) {
      setupMoviePreview(card, item.id);
    }
    if (enableTvPreview) {
      setupTvPreview(card, item.id);
    }
  });
}

function renderCurrentPage() {
  const startIndex = currentPage * PAGE_SIZE;
  const currentMovies = allMovies.slice(startIndex, startIndex + PAGE_SIZE);
  renderPosterGrid(movieGrid, currentMovies, startIndex, {
    isSearchMode,
    nameKey: "title",
    enableMoviePreview: true,
  });
  updateNavButtons();
}

function renderTvCurrentPage() {
  const startIndex = tvCurrentPage * PAGE_SIZE;
  const currentShows = allTvShows.slice(startIndex, startIndex + PAGE_SIZE);
  renderPosterGrid(tvGrid, currentShows, startIndex, {
    isSearchMode: false,
    nameKey: "name",
    enableTvPreview: true,
  });
  updateTvNavButtons();
}

function updateNavButtons() {
  const totalPages = Math.ceil(allMovies.length / PAGE_SIZE);
  prevButton.disabled = currentPage === 0;
  nextButton.disabled = currentPage >= totalPages - 1 || totalPages === 0;
}

function updateTvNavButtons() {
  const totalPages = Math.ceil(allTvShows.length / PAGE_SIZE);
  tvPrevButton.disabled = tvCurrentPage === 0;
  tvNextButton.disabled = tvCurrentPage >= totalPages - 1 || totalPages === 0;
}

function setupNavigation() {
  prevButton.addEventListener("click", () => {
    if (currentPage === 0) return;
    currentPage -= 1;
    renderCurrentPage();
  });

  nextButton.addEventListener("click", () => {
    const totalPages = Math.ceil(allMovies.length / PAGE_SIZE);
    if (currentPage >= totalPages - 1) return;
    currentPage += 1;
    renderCurrentPage();
  });
}

function setupTvNavigation() {
  tvPrevButton.addEventListener("click", () => {
    if (tvCurrentPage === 0) return;
    tvCurrentPage -= 1;
    renderTvCurrentPage();
  });

  tvNextButton.addEventListener("click", () => {
    const totalPages = Math.ceil(allTvShows.length / PAGE_SIZE);
    if (tvCurrentPage >= totalPages - 1) return;
    tvCurrentPage += 1;
    renderTvCurrentPage();
  });
}

function setupSearch() {
  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();

    try {
      renderStateMessage(movieGrid, "검색 결과를 불러오는 중입니다...");

      if (!query) {
        sectionTitle.textContent = "인기 영화 TOP 20";
        isSearchMode = false;
        allMovies = await fetchPopularMovies();
      } else {
        sectionTitle.textContent = `"${query}" 검색 결과`;
        isSearchMode = true;
        allMovies = await searchMovies(query);
      }

      currentPage = 0;

      if (allMovies.length === 0) {
        renderStateMessage(movieGrid, "검색 결과가 없습니다.");
        updateNavButtons();
        return;
      }

      renderCurrentPage();
    } catch (error) {
      renderStateMessage(movieGrid, "검색에 실패했습니다. 잠시 후 다시 시도해주세요.", true);
      console.error(error);
    }
  });
}

function setupHomeLink() {
  homeLink.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      renderStateMessage(movieGrid, "홈 화면으로 이동 중입니다...");
      renderStateMessage(tvGrid, "TV 시리즈를 불러오는 중입니다...");
      sectionTitle.textContent = "인기 영화 TOP 20";
      searchInput.value = "";
      isSearchMode = false;
      currentPage = 0;
      tvCurrentPage = 0;

      const [movies, tvShows] = await Promise.all([fetchPopularMovies(), fetchPopularTv()]);
      allMovies = movies;
      allTvShows = tvShows;

      if (allMovies.length === 0) {
        renderStateMessage(movieGrid, "표시할 영화가 없습니다.");
      } else {
        renderCurrentPage();
      }

      if (allTvShows.length === 0) {
        renderStateMessage(tvGrid, "표시할 TV 시리즈가 없습니다.");
      } else {
        renderTvCurrentPage();
      }
    } catch (error) {
      renderStateMessage(movieGrid, "홈 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.", true);
      renderStateMessage(tvGrid, "TV 목록을 불러오지 못했습니다.", true);
      console.error(error);
    }
  });
}

async function init() {
  try {
    renderStateMessage(movieGrid, "인기 영화를 불러오는 중입니다...");
    renderStateMessage(tvGrid, "인기 TV 시리즈를 불러오는 중입니다...");

    const [movies, tvShows] = await Promise.all([fetchPopularMovies(), fetchPopularTv()]);
    allMovies = movies;
    allTvShows = tvShows;

    setupNavigation();
    setupTvNavigation();
    setupSearch();
    setupHomeLink();
    setupModal();

    if (allMovies.length === 0) {
      renderStateMessage(movieGrid, "표시할 영화가 없습니다.");
    } else {
      renderCurrentPage();
    }

    if (allTvShows.length === 0) {
      renderStateMessage(tvGrid, "표시할 TV 시리즈가 없습니다.");
    } else {
      renderTvCurrentPage();
    }
  } catch (error) {
    renderStateMessage(movieGrid, "영화 목록을 불러오지 못했습니다. API 키/네트워크를 확인해주세요.", true);
    renderStateMessage(tvGrid, "TV 목록을 불러오지 못했습니다.", true);
    console.error(error);
  }
}

init();
