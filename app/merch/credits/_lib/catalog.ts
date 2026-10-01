// Generated from Printful's public catalog (api.printful.com/products/{id}) on 2026-10-01.
// variantIds map "Color|Size" → Printful catalog variant id. printfulCost is Printful's base price in cents (before
// shipping), kept for margin checks only. Prices are in US cents. Edit prices here; re-run the generator for new items.
export type Product = {
  key: string; printfulProductId: number; name: string; detail: string; placement: string;
  colors: string[]; sizes: string[]; sizeLabel: string; colorLabel: string; hideColor: boolean;
  price: number | Record<string, number>; variantIds: Record<string, number>; printfulCost: Record<string, number>;
};
export const PRODUCTS: Product[] = [
  {
    "key": "tee",
    "printfulProductId": 71,
    "name": "T-Shirt",
    "detail": "Bella+Canvas 3001 · soft cotton",
    "placement": "front",
    "colors": [
      "Black",
      "White"
    ],
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL"
    ],
    "sizeLabel": "Size",
    "colorLabel": "Color",
    "hideColor": false,
    "price": 3500,
    "variantIds": {
      "Black|S": 4016,
      "Black|M": 4017,
      "Black|L": 4018,
      "Black|XL": 4019,
      "Black|2XL": 4020,
      "White|S": 4011,
      "White|M": 4012,
      "White|L": 4013,
      "White|XL": 4014,
      "White|2XL": 4015
    },
    "printfulCost": {
      "Black|S": 1192,
      "Black|M": 1192,
      "Black|L": 1192,
      "Black|XL": 1192,
      "Black|2XL": 1392,
      "White|S": 1192,
      "White|M": 1192,
      "White|L": 1192,
      "White|XL": 1192,
      "White|2XL": 1392
    }
  },
  {
    "key": "hoodie",
    "printfulProductId": 146,
    "name": "Hoodie",
    "detail": "Gildan 18500 · heavy blend",
    "placement": "front",
    "colors": [
      "Black",
      "White"
    ],
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL"
    ],
    "sizeLabel": "Size",
    "colorLabel": "Color",
    "hideColor": false,
    "price": 6500,
    "variantIds": {
      "Black|S": 5530,
      "Black|M": 5531,
      "Black|L": 5532,
      "Black|XL": 5533,
      "Black|2XL": 5534,
      "White|S": 5522,
      "White|M": 5523,
      "White|L": 5524,
      "White|XL": 5525,
      "White|2XL": 5526
    },
    "printfulCost": {
      "Black|S": 2263,
      "Black|M": 2263,
      "Black|L": 2263,
      "Black|XL": 2263,
      "Black|2XL": 2463,
      "White|S": 2263,
      "White|M": 2263,
      "White|L": 2263,
      "White|XL": 2263,
      "White|2XL": 2463
    }
  },
  {
    "key": "poster",
    "printfulProductId": 1,
    "name": "Poster",
    "detail": "Enhanced matte paper",
    "placement": "default",
    "colors": [],
    "sizes": [
      "12″×16″",
      "18″×24″"
    ],
    "sizeLabel": "Size",
    "colorLabel": "Color",
    "hideColor": false,
    "price": {
      "12″×16″": 3000,
      "18″×24″": 4000
    },
    "variantIds": {
      "|12″×16″": 1349,
      "|18″×24″": 1
    },
    "printfulCost": {
      "|12″×16″": 1111,
      "|18″×24″": 1315
    }
  },
  {
    "key": "frame",
    "printfulProductId": 2,
    "name": "Framed Print",
    "detail": "Matte paper, wood frame",
    "placement": "default",
    "colors": [
      "Black",
      "White"
    ],
    "sizes": [
      "8″×10″",
      "12″×16″"
    ],
    "sizeLabel": "Size",
    "colorLabel": "Frame",
    "hideColor": false,
    "price": {
      "8″×10″": 4500,
      "12″×16″": 6000
    },
    "variantIds": {
      "Black|8″×10″": 4651,
      "Black|12″×16″": 1350,
      "White|8″×10″": 10754,
      "White|12″×16″": 10751
    },
    "printfulCost": {
      "Black|8″×10″": 2076,
      "Black|12″×16″": 3220,
      "White|8″×10″": 2076,
      "White|12″×16″": 3220
    }
  },
  {
    "key": "shorts",
    "printfulProductId": 482,
    "name": "Fleece Shorts",
    "detail": "Independent Trading · leg print",
    "placement": "leg_front_left",
    "colors": [
      "Black",
      "White"
    ],
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL"
    ],
    "sizeLabel": "Size",
    "colorLabel": "Color",
    "hideColor": false,
    "price": 5500,
    "variantIds": {
      "Black|S": 12444,
      "Black|M": 12445,
      "Black|L": 12446,
      "Black|XL": 12447,
      "Black|2XL": 12448,
      "White|S": 12454,
      "White|M": 12455,
      "White|L": 12456,
      "White|XL": 12457,
      "White|2XL": 12458
    },
    "printfulCost": {
      "Black|S": 2647,
      "Black|M": 2647,
      "Black|L": 2647,
      "Black|XL": 2647,
      "Black|2XL": 2847,
      "White|S": 2647,
      "White|M": 2647,
      "White|L": 2647,
      "White|XL": 2647,
      "White|2XL": 2847
    }
  },
  {
    "key": "sweats",
    "printfulProductId": 412,
    "name": "Sweatpants",
    "detail": "Cotton Heritage fleece · leg print",
    "placement": "leg_front_left",
    "colors": [
      "Black",
      "White"
    ],
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL"
    ],
    "sizeLabel": "Size",
    "colorLabel": "Color",
    "hideColor": false,
    "price": 6000,
    "variantIds": {
      "Black|S": 11266,
      "Black|M": 11267,
      "Black|L": 11268,
      "Black|XL": 11269,
      "Black|2XL": 11270,
      "White|S": 11272,
      "White|M": 11273,
      "White|L": 11274,
      "White|XL": 11275,
      "White|2XL": 11276
    },
    "printfulCost": {
      "Black|S": 2998,
      "Black|M": 2998,
      "Black|L": 2998,
      "Black|XL": 2998,
      "Black|2XL": 3198,
      "White|S": 2998,
      "White|M": 2998,
      "White|L": 2998,
      "White|XL": 2998,
      "White|2XL": 3198
    }
  },
  {
    "key": "stickers",
    "printfulProductId": 358,
    "name": "Stickers",
    "detail": "Kiss-cut vinyl",
    "placement": "default",
    "colors": [],
    "sizes": [
      "3″×3″",
      "4″×4″"
    ],
    "sizeLabel": "Size",
    "colorLabel": "Color",
    "hideColor": false,
    "price": {
      "3″×3″": 800,
      "4″×4″": 1000
    },
    "variantIds": {
      "|3″×3″": 10163,
      "|4″×4″": 10164
    },
    "printfulCost": {
      "|3″×3″": 234,
      "|4″×4″": 254
    }
  },
  {
    "key": "phone",
    "printfulProductId": 601,
    "name": "Phone Case",
    "detail": "Tough case · glossy",
    "placement": "default",
    "colors": [
      "Glossy"
    ],
    "sizes": [
      "iPhone 13",
      "iPhone 13 Pro",
      "iPhone 13 Pro Max",
      "iPhone 14",
      "iPhone 14 Pro",
      "iPhone 14 Pro Max",
      "iPhone 15",
      "iPhone 15 Pro",
      "iPhone 15 Pro Max",
      "iPhone 16",
      "iPhone 16 Pro",
      "iPhone 16 Pro Max",
      "iPhone 17",
      "iPhone 17 Pro",
      "iPhone 17 Pro Max"
    ],
    "sizeLabel": "Model",
    "colorLabel": "Color",
    "hideColor": true,
    "price": 3500,
    "variantIds": {
      "Glossy|iPhone 13": 15388,
      "Glossy|iPhone 13 Pro": 15390,
      "Glossy|iPhone 13 Pro Max": 15391,
      "Glossy|iPhone 14": 16124,
      "Glossy|iPhone 14 Pro": 16126,
      "Glossy|iPhone 14 Pro Max": 16130,
      "Glossy|iPhone 15": 17714,
      "Glossy|iPhone 15 Pro": 17718,
      "Glossy|iPhone 15 Pro Max": 17720,
      "Glossy|iPhone 16": 20302,
      "Glossy|iPhone 16 Pro": 20304,
      "Glossy|iPhone 16 Pro Max": 20305,
      "Glossy|iPhone 17": 33985,
      "Glossy|iPhone 17 Pro": 33987,
      "Glossy|iPhone 17 Pro Max": 33988
    },
    "printfulCost": {
      "Glossy|iPhone 13": 1423,
      "Glossy|iPhone 13 Pro": 1423,
      "Glossy|iPhone 13 Pro Max": 1423,
      "Glossy|iPhone 14": 1423,
      "Glossy|iPhone 14 Pro": 1423,
      "Glossy|iPhone 14 Pro Max": 1423,
      "Glossy|iPhone 15": 1423,
      "Glossy|iPhone 15 Pro": 1423,
      "Glossy|iPhone 15 Pro Max": 1423,
      "Glossy|iPhone 16": 1423,
      "Glossy|iPhone 16 Pro": 1423,
      "Glossy|iPhone 16 Pro Max": 1423,
      "Glossy|iPhone 17": 1423,
      "Glossy|iPhone 17 Pro": 1423,
      "Glossy|iPhone 17 Pro Max": 1423
    }
  }
];

export const productByKey = (k: string) => PRODUCTS.find((p) => p.key === k);
export const priceOf = (p: Product, size: string) => (typeof p.price === "number" ? p.price : p.price[size]);
export const variantOf = (p: Product, color: string, size: string) => p.variantIds[`${p.colors.length ? color : ""}|${size}`];
