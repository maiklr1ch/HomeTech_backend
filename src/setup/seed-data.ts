type SeedAttribute = {
  name: string;
  type: 'number' | 'enum' | 'bool' | 'text';
  unit?: string;
  options?: string[];
  isFilterable: boolean;
};

type SeedCategory = {
  name: string;
  slug: string;
  importPattern: string;
  attributes: SeedAttribute[];
};

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'Холодильники',
    slug: 'refrigerators',
    importPattern: '^холодильник',
    attributes: [
      { name: 'Тип конструкції', type: 'enum', options: ['Однокамерний', 'Двокамерний', 'Side-by-Side', 'Багатодверний'], isFilterable: true },
      { name: 'Загальний об’єм', type: 'number', unit: 'л', isFilterable: true },
      { name: 'Висота', type: 'number', unit: 'см', isFilterable: true },
      { name: 'Ширина', type: 'number', unit: 'см', isFilterable: false },
      { name: 'No Frost', type: 'bool', isFilterable: true },
      { name: 'Клас енергоефективності', type: 'enum', options: ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'], isFilterable: true },
      { name: 'Колір', type: 'enum', options: ['Білий', 'Сріблястий', 'Чорний', 'Бежевий', 'Нержавіюча сталь'], isFilterable: true },
    ],
  },
  {
    name: 'Чайники',
    slug: 'kettles',
    importPattern: '^(електро)?чайник',
    attributes: [
      { name: 'Об’єм', type: 'number', unit: 'л', isFilterable: true },
      { name: 'Потужність', type: 'number', unit: 'Вт', isFilterable: true },
      { name: 'Матеріал корпусу', type: 'enum', options: ['Пластик', 'Нержавіюча сталь', 'Скло', 'Кераміка'], isFilterable: true },
      { name: 'Регулювання температури', type: 'bool', isFilterable: true },
    ],
  },
  {
    name: 'Витяжки',
    slug: 'range-hoods',
    importPattern: '^витяжка',
    attributes: [
      { name: 'Тип', type: 'enum', options: ['Купольна', 'Похила', 'Плоска', 'Телескопічна', 'Вбудована', 'Острівна'], isFilterable: true },
      { name: 'Ширина', type: 'number', unit: 'см', isFilterable: true },
      { name: 'Продуктивність', type: 'number', unit: 'м³/год', isFilterable: true },
      { name: 'Режим роботи', type: 'enum', options: ['Відведення', 'Циркуляція', 'Відведення й циркуляція'], isFilterable: true },
      { name: 'Рівень шуму', type: 'number', unit: 'дБ', isFilterable: false },
    ],
  },
  {
    name: 'Пилососи',
    slug: 'vacuum-cleaners',
    importPattern: '^(робот-)?пилосос',
    attributes: [
      { name: 'Тип', type: 'enum', options: ['З мішком', 'Контейнерний', 'Вертикальний', 'Робот-пилосос', 'Миючий'], isFilterable: true },
      { name: 'Живлення', type: 'enum', options: ['Від мережі', 'Акумуляторне'], isFilterable: true },
      { name: 'Споживана потужність', type: 'number', unit: 'Вт', isFilterable: true },
      { name: 'Об’єм пилозбірника', type: 'number', unit: 'л', isFilterable: true },
      { name: 'Вологе прибирання', type: 'bool', isFilterable: true },
    ],
  },
  {
    name: 'Мікрохвильові печі',
    slug: 'microwave-ovens',
    importPattern: '^(мікрохвильова піч|мікрохвильовка|піч мікрохвильова)',
    attributes: [
      { name: 'Об’єм камери', type: 'number', unit: 'л', isFilterable: true },
      { name: 'Потужність мікрохвиль', type: 'number', unit: 'Вт', isFilterable: true },
      { name: 'Гриль', type: 'bool', isFilterable: true },
      { name: 'Тип керування', type: 'enum', options: ['Механічне', 'Електронне', 'Сенсорне'], isFilterable: true },
      { name: 'Вбудовувана', type: 'bool', isFilterable: true },
    ],
  },
];
