// ЕДИНЫЙ список мест — источник правды для сайта и мобильного приложения.
//
// Раньше он был скопирован в двух местах (src/data/places.ts и Places.swift),
// и файлы неизбежно расходились. Теперь правим только здесь: при старте сервера
// список заливается в таблицу places, а клиенты забирают его через GET /api/places.
//
// ВАЖНО: id менять нельзя — на них завязаны посещённые места и достижения
// (таблица place_visits). Новые места добавлять со следующим свободным id.
export const PLACES = [
  {
    "id": 1,
    "name": "Красная площадь",
    "category": "landmark",
    "description": "Главная площадь России. Здесь находятся Кремль, Собор Василия Блаженного, ГУМ и Мавзолей Ленина. Одно из самых узнаваемых мест в мире.",
    "address": "Красная площадь, Москва",
    "lat": 55.7539,
    "lng": 37.6208,
    "price": 0,
    "duration": 60,
    "rating": 4.9,
    "ratingCount": 133,
    "tags": [
      "история",
      "архитектура",
      "обязательно"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/RedSquare_Panorama_crop.jpg/1280px-RedSquare_Panorama_crop.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/RedSquare_Panorama_crop.jpg/1280px-RedSquare_Panorama_crop.jpg",
      "",
      "",
      ""
    ],
    "opensAt": "09:00",
    "closesAt": "21:00",
    "ticketUrl": ""
  },
  {
    "id": 2,
    "name": "Московский Кремль",
    "category": "landmark",
    "description": "Резиденция президента России и уникальный архитектурный ансамбль с соборами, башнями и музеями. Сердце Москвы на протяжении восьми веков.",
    "address": "Кремль, Москва",
    "lat": 55.752,
    "lng": 37.6175,
    "price": 700,
    "duration": 120,
    "rating": 4.8,
    "ratingCount": 206,
    "tags": [
      "история",
      "архитектура",
      "музей"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Moscow_July_2011-7a.jpg/1280px-Moscow_July_2011-7a.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Moscow_July_2011-7a.jpg/1280px-Moscow_July_2011-7a.jpg",
      "",
      "",
      "",
      ""
    ],
    "opensAt": "09:00",
    "closesAt": "21:00",
    "ticketUrl": "https://kreml.ru/tickets/"
  },
  {
    "id": 3,
    "name": "Третьяковская галерея",
    "category": "museum",
    "description": "Крупнейшее собрание русского изобразительного искусства. Более 180 000 экспонатов, включая работы Репина, Сурикова, Левитана и Рублёва.",
    "address": "Лаврушинский пер., 10",
    "lat": 55.7415,
    "lng": 37.6208,
    "price": 600,
    "duration": 180,
    "rating": 4.8,
    "ratingCount": 279,
    "tags": [
      "искусство",
      "живопись",
      "культура"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Tretyakov_Gallery_1.jpg/1280px-Tretyakov_Gallery_1.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Tretyakov_Gallery_1.jpg/1280px-Tretyakov_Gallery_1.jpg",
      "",
      ""
    ],
    "opensAt": "10:00",
    "closesAt": "19:00",
    "ticketUrl": "https://www.tretyakovgallery.ru/tickets/"
  },
  {
    "id": 4,
    "name": "Парк Горького",
    "category": "park",
    "description": "Любимый парк москвичей на берегу Москвы-реки. Летом — кафе, шезлонги и фонтаны, зимой — каток. Отличное место для отдыха в любое время года.",
    "address": "Крымский Вал, 9",
    "lat": 55.7298,
    "lng": 37.6008,
    "price": 0,
    "duration": 120,
    "rating": 4.7,
    "ratingCount": 352,
    "tags": [
      "прогулка",
      "отдых",
      "природа"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Gorky_park_in_Moscow.jpg/1280px-Gorky_park_in_Moscow.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Gorky_park_in_Moscow.jpg/1280px-Gorky_park_in_Moscow.jpg",
      "",
      "",
      ""
    ],
    "opensAt": "00:00",
    "closesAt": "",
    "ticketUrl": ""
  },
  {
    "id": 5,
    "name": "Старый Арбат",
    "category": "landmark",
    "description": "Пешеходная улица с художниками, уличными музыкантами, галереями и сувенирными лавками. Одна из старейших улиц Москвы с богатой историей.",
    "address": "ул. Арбат, Москва",
    "lat": 55.7494,
    "lng": 37.5927,
    "price": 0,
    "duration": 90,
    "rating": 4.5,
    "ratingCount": 425,
    "tags": [
      "прогулка",
      "культура",
      "шопинг"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Arbat_Street_in_Moscow.jpg/1280px-Arbat_Street_in_Moscow.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Arbat_Street_in_Moscow.jpg/1280px-Arbat_Street_in_Moscow.jpg",
      "",
      "",
      "",
      ""
    ],
    "opensAt": "09:00",
    "closesAt": "21:00",
    "ticketUrl": ""
  },
  {
    "id": 6,
    "name": "ВДНХ",
    "category": "park",
    "description": "Огромный выставочный парк с павильонами советской эпохи, фонтанами и Останкинской башней рядом. Один из символов Москвы.",
    "address": "проспект Мира, 119",
    "lat": 55.8269,
    "lng": 37.6378,
    "price": 0,
    "duration": 180,
    "rating": 4.6,
    "ratingCount": 498,
    "tags": [
      "архитектура",
      "парк",
      "история"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/VDNKh_in_Moscow.jpg/1280px-VDNKh_in_Moscow.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/VDNKh_in_Moscow.jpg/1280px-VDNKh_in_Moscow.jpg",
      "",
      ""
    ],
    "opensAt": "00:00",
    "closesAt": "",
    "ticketUrl": ""
  },
  {
    "id": 7,
    "name": "Воробьёвы горы",
    "category": "park",
    "description": "Лучшая смотровая площадка Москвы с панорамным видом на весь город. Рядом — МГУ, Новодевичий монастырь и Лужники.",
    "address": "Воробьёвы горы, Москва",
    "lat": 55.7102,
    "lng": 37.5425,
    "price": 0,
    "duration": 90,
    "rating": 4.7,
    "ratingCount": 571,
    "tags": [
      "вид",
      "природа",
      "прогулка"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Sparrow_Hills_Moscow.jpg/1280px-Sparrow_Hills_Moscow.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Sparrow_Hills_Moscow.jpg/1280px-Sparrow_Hills_Moscow.jpg",
      "",
      "",
      ""
    ],
    "opensAt": "00:00",
    "closesAt": "",
    "ticketUrl": ""
  },
  {
    "id": 8,
    "name": "Парк Зарядье",
    "category": "park",
    "description": "Современный парк у стен Кремля с уникальным парящим мостом над Москвой-рекой, ледяной пещерой, медиацентром и амфитеатром.",
    "address": "ул. Варварка, 6с2",
    "lat": 55.751,
    "lng": 37.6282,
    "price": 0,
    "duration": 90,
    "rating": 4.6,
    "ratingCount": 644,
    "tags": [
      "современный",
      "архитектура",
      "вид"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Zaryadye_Park_Moscow.jpg/1280px-Zaryadye_Park_Moscow.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Zaryadye_Park_Moscow.jpg/1280px-Zaryadye_Park_Moscow.jpg",
      "",
      "",
      "",
      ""
    ],
    "opensAt": "00:00",
    "closesAt": "",
    "ticketUrl": ""
  },
  {
    "id": 9,
    "name": "ГУМ",
    "category": "restaurant",
    "description": "Исторический торговый центр на Красной площади с роскошными галереями. Рестораны, кафе и легендарное мороженое — обязательно попробуй.",
    "address": "Красная площадь, 3",
    "lat": 55.7546,
    "lng": 37.6218,
    "price": 500,
    "duration": 60,
    "rating": 4.5,
    "ratingCount": 717,
    "tags": [
      "еда",
      "шопинг",
      "история"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/GUM_Moscow.jpg/1280px-GUM_Moscow.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/GUM_Moscow.jpg/1280px-GUM_Moscow.jpg",
      "",
      ""
    ],
    "opensAt": "11:00",
    "closesAt": "23:00",
    "ticketUrl": ""
  },
  {
    "id": 10,
    "name": "Музей Москвы",
    "category": "museum",
    "description": "История города от древности до наших дней. Уникальные артефакты, интерактивные экспозиции и временные выставки современного искусства.",
    "address": "Зубовский бул., 2",
    "lat": 55.7418,
    "lng": 37.5908,
    "price": 400,
    "duration": 120,
    "rating": 4.4,
    "ratingCount": 790,
    "tags": [
      "история",
      "город",
      "культура"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Museum_of_Moscow.jpg/1280px-Museum_of_Moscow.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Museum_of_Moscow.jpg/1280px-Museum_of_Moscow.jpg",
      "",
      "",
      ""
    ],
    "opensAt": "10:00",
    "closesAt": "19:00",
    "ticketUrl": "https://mosmuseum.ru/"
  },
  {
    "id": 11,
    "name": "Царицыно",
    "category": "landmark",
    "description": "Дворцово-парковый ансамбль XVIII века с прудами и романтичными руинами. Один из красивейших парков Москвы в любое время года.",
    "address": "ул. Дольская, 1",
    "lat": 55.6167,
    "lng": 37.6667,
    "price": 350,
    "duration": 180,
    "rating": 4.6,
    "ratingCount": 863,
    "tags": [
      "история",
      "архитектура",
      "парк"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Tsaritsyno_Moscow.jpg/1280px-Tsaritsyno_Moscow.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Tsaritsyno_Moscow.jpg/1280px-Tsaritsyno_Moscow.jpg",
      "",
      "",
      "",
      ""
    ],
    "opensAt": "09:00",
    "closesAt": "21:00",
    "ticketUrl": "https://tsaritsyno-museum.ru/tickets/"
  },
  {
    "id": 12,
    "name": "Коломенское",
    "category": "park",
    "description": "Бывшая царская усадьба на крутом берегу Москвы-реки. Церковь Вознесения — объект Всемирного наследия ЮНЕСКО, построена в 1532 году.",
    "address": "просп. Андропова, 39",
    "lat": 55.6678,
    "lng": 37.6697,
    "price": 0,
    "duration": 120,
    "rating": 4.7,
    "ratingCount": 936,
    "tags": [
      "история",
      "природа",
      "ЮНЕСКО"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Kolomenskoye_Moscow.jpg/1280px-Kolomenskoye_Moscow.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Kolomenskoye_Moscow.jpg/1280px-Kolomenskoye_Moscow.jpg",
      "",
      ""
    ],
    "opensAt": "00:00",
    "closesAt": "",
    "ticketUrl": ""
  },
  {
    "id": 13,
    "name": "Ботанический сад",
    "category": "park",
    "description": "Один из крупнейших ботанических садов Европы — 700 гектаров, японский сад, розарий и оранжереи с тропическими растениями.",
    "address": "ул. Ботаническая, 4",
    "lat": 55.8444,
    "lng": 37.5778,
    "price": 200,
    "duration": 120,
    "rating": 4.5,
    "ratingCount": 109,
    "tags": [
      "природа",
      "тишина",
      "прогулка"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Moscow_Botanical_Garden.jpg/1280px-Moscow_Botanical_Garden.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Moscow_Botanical_Garden.jpg/1280px-Moscow_Botanical_Garden.jpg",
      "",
      "",
      ""
    ],
    "opensAt": "00:00",
    "closesAt": "",
    "ticketUrl": ""
  },
  {
    "id": 14,
    "name": "Измайловский парк",
    "category": "park",
    "description": "Один из крупнейших парков Европы с сосновыми лесами, прудами и знаменитым Кремлём-рынком с антиквариатом и сувенирами.",
    "address": "Народный просп., 17",
    "lat": 55.79,
    "lng": 37.7517,
    "price": 0,
    "duration": 180,
    "rating": 4.4,
    "ratingCount": 182,
    "tags": [
      "природа",
      "рынок",
      "прогулка"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Izmailovsky_Park_Moscow.jpg/1280px-Izmailovsky_Park_Moscow.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Izmailovsky_Park_Moscow.jpg/1280px-Izmailovsky_Park_Moscow.jpg",
      "",
      "",
      "",
      ""
    ],
    "opensAt": "00:00",
    "closesAt": "",
    "ticketUrl": ""
  },
  {
    "id": 15,
    "name": "Новодевичий монастырь",
    "category": "landmark",
    "description": "Действующий женский монастырь XVI века — объект Всемирного наследия ЮНЕСКО. Рядом — знаменитое Новодевичье кладбище.",
    "address": "Новодевичий пр., 1",
    "lat": 55.7267,
    "lng": 37.5567,
    "price": 300,
    "duration": 60,
    "rating": 4.7,
    "ratingCount": 255,
    "tags": [
      "история",
      "архитектура",
      "ЮНЕСКО"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Novodevichy_Convent_Moscow.jpg/1280px-Novodevichy_Convent_Moscow.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Novodevichy_Convent_Moscow.jpg/1280px-Novodevichy_Convent_Moscow.jpg",
      "",
      ""
    ],
    "opensAt": "09:00",
    "closesAt": "21:00",
    "ticketUrl": "https://novodevich.ru/"
  },
  {
    "id": 16,
    "name": "Патриаршие пруды",
    "category": "park",
    "description": "Атмосферный район с прудом, уютными кафе и бульварами. Место действия романа «Мастер и Маргарита» Булгакова.",
    "address": "Патриарший пр., Москва",
    "lat": 55.7636,
    "lng": 37.5933,
    "price": 0,
    "duration": 60,
    "rating": 4.5,
    "ratingCount": 328,
    "tags": [
      "атмосфера",
      "прогулка",
      "литература"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Patriarshy_Ponds_Moscow.jpg/1280px-Patriarshy_Ponds_Moscow.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Patriarshy_Ponds_Moscow.jpg/1280px-Patriarshy_Ponds_Moscow.jpg",
      "",
      "",
      ""
    ],
    "opensAt": "00:00",
    "closesAt": "",
    "ticketUrl": ""
  },
  {
    "id": 17,
    "name": "Останкинская башня",
    "category": "landmark",
    "description": "Самое высокое сооружение Европы высотой 540 м. Смотровая площадка на 337 м со стеклянным полом и ресторан с панорамным видом.",
    "address": "ул. Академика Королёва, 15к2",
    "lat": 55.8197,
    "lng": 37.6114,
    "price": 1300,
    "duration": 90,
    "rating": 4.5,
    "ratingCount": 401,
    "tags": [
      "вид",
      "архитектура",
      "аттракцион"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Ostankino_Tower_Moscow.jpg/800px-Ostankino_Tower_Moscow.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Ostankino_Tower_Moscow.jpg/800px-Ostankino_Tower_Moscow.jpg",
      "",
      "",
      "",
      ""
    ],
    "opensAt": "09:00",
    "closesAt": "21:00",
    "ticketUrl": "https://ostankino.ru/tickets.html"
  },
  {
    "id": 18,
    "name": "Собор Василия Блаженного",
    "category": "landmark",
    "description": "Один из главных символов России, построенный в 1561 году по приказу Ивана Грозного. Девять уникальных куполов, каждый непохож на другой.",
    "address": "Красная площадь, 2",
    "lat": 55.7525,
    "lng": 37.6231,
    "price": 500,
    "duration": 60,
    "rating": 4.9,
    "ratingCount": 474,
    "tags": [
      "история",
      "архитектура",
      "обязательно"
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Храм_Василия_Блаженного.jpg/800px-Храм_Василия_Блаженного.jpg",
    "photos": [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Храм_Василия_Блаженного.jpg/800px-Храм_Василия_Блаженного.jpg",
      "",
      ""
    ],
    "opensAt": "09:00",
    "closesAt": "21:00",
    "ticketUrl": "https://shm.ru/museum/hvb/"
  },
  {
    "id": 19,
    "name": "Мята Lounge",
    "category": "nightlife",
    "description": "Сеть кальянных лаунж-баров: уютная атмосфера, большой выбор кальянов и коктейлей. Вход с 18 лет.",
    "address": "ул. Тверская, 18, Москва",
    "lat": 55.7637,
    "lng": 37.6063,
    "price": 1500,
    "duration": 120,
    "rating": 4.5,
    "ratingCount": 547,
    "tags": [
      "18+",
      "кальян",
      "лаунж",
      "бар"
    ],
    "imageUrl": "",
    "photos": [
      "",
      "",
      "",
      ""
    ],
    "opensAt": "18:00",
    "closesAt": "06:00",
    "ticketUrl": ""
  },
  {
    "id": 20,
    "name": "Ночной клуб Pravda",
    "category": "nightlife",
    "description": "Танцевальный клуб с электронной музыкой и выступлениями диджеев. Открыт до утра. Строго 18+, фейсконтроль.",
    "address": "Большой Путинковский пер., 5, Москва",
    "lat": 55.7672,
    "lng": 37.6118,
    "price": 1000,
    "duration": 180,
    "rating": 4.3,
    "ratingCount": 620,
    "tags": [
      "18+",
      "клуб",
      "танцы",
      "ночь"
    ],
    "imageUrl": "",
    "photos": [
      "",
      "",
      "",
      "",
      ""
    ],
    "opensAt": "18:00",
    "closesAt": "06:00",
    "ticketUrl": ""
  },
  {
    "id": 21,
    "name": "Бар «Полночь»",
    "category": "nightlife",
    "description": "Коктейльный бар с авторскими напитками и живой музыкой по выходным. Работает до 4 утра. Вход 18+.",
    "address": "ул. Никольская, 10, Москва",
    "lat": 55.7574,
    "lng": 37.6242,
    "price": 1200,
    "duration": 120,
    "rating": 4.6,
    "ratingCount": 693,
    "tags": [
      "18+",
      "бар",
      "коктейли",
      "музыка"
    ],
    "imageUrl": "",
    "photos": [
      "",
      "",
      ""
    ],
    "opensAt": "18:00",
    "closesAt": "06:00",
    "ticketUrl": ""
  },
  {
    "id": 22,
    "name": "Ночной ресторан «Луна»",
    "category": "nightlife",
    "description": "Ресторан с поздней кухней и панорамной террасой. Кухня и бар работают до утра. Подходит для компаний 18+.",
    "address": "Кутузовский просп., 2/1, Москва",
    "lat": 55.7475,
    "lng": 37.5669,
    "price": 2500,
    "duration": 150,
    "rating": 4.7,
    "ratingCount": 766,
    "tags": [
      "18+",
      "ресторан",
      "ночь",
      "терраса"
    ],
    "imageUrl": "",
    "photos": [
      "",
      "",
      "",
      ""
    ],
    "opensAt": "18:00",
    "closesAt": "06:00",
    "ticketUrl": ""
  },
  {
    "id": 23,
    "name": "Кальянная Hookah Place",
    "category": "nightlife",
    "description": "Современная кальянная с большим меню табаков и закусок. Тихая музыка, приставки, настольные игры. 18+.",
    "address": "Цветной бул., 11, Москва",
    "lat": 55.7708,
    "lng": 37.6201,
    "price": 1300,
    "duration": 120,
    "rating": 4.4,
    "ratingCount": 839,
    "tags": [
      "18+",
      "кальян",
      "отдых"
    ],
    "imageUrl": "",
    "photos": [
      "",
      "",
      "",
      "",
      ""
    ],
    "opensAt": "18:00",
    "closesAt": "06:00",
    "ticketUrl": ""
  }
];
