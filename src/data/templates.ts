// Default item templates built from SmartPOS data
// Alterations: Sew Smart price list | Dry Cleaning: St Ives DC price list

export interface TemplateItem {
  category: string
  subCategory: string
  name: string
  price: number
}

export const ALTERATIONS_CATEGORIES: string[] = [
  "Accessories",
  "Blazer",
  "Blouse",
  "Button",
  "Dress",
  "Elastic",
  "Evening / Formal",
  "Household",
  "Pant",
  "Patch",
  "Pocket",
  "Repair",
  "School",
  "Shirt",
  "Skirt",
  "Trouser",
  "Waist",
  "Wedding",
  "Zipper"
]

export const DC_CATEGORIES: string[] = [
  "*Deluxe*",
  "Accessories",
  "Blazer",
  "Blouse",
  "Camping",
  "Cardigans",
  "Coat",
  "Dress",
  "Household",
  "Jacket",
  "Jumper",
  "Leather",
  "Pant",
  "School",
  "Shirt",
  "Shorts",
  "Skirt",
  "Suit",
  "Tie",
  "Trouser",
  "Vest",
  "Wedding"
]

export const ALTERATIONS_ITEMS: TemplateItem[] = [
  {
    "category": "Accessories",
    "subCategory": "Accessories",
    "name": "Chef's Jacket",
    "price": 13.5
  },
  {
    "category": "Accessories",
    "subCategory": "Accessories",
    "name": "Dental Gown",
    "price": 14.5
  },
  {
    "category": "Accessories",
    "subCategory": "Accessories",
    "name": "Gloves",
    "price": 12.5
  },
  {
    "category": "Accessories",
    "subCategory": "Accessories",
    "name": "Hat / Cap",
    "price": 13
  },
  {
    "category": "Accessories",
    "subCategory": "Accessories",
    "name": "Jump Suit - Long",
    "price": 34
  },
  {
    "category": "Accessories",
    "subCategory": "Accessories",
    "name": "Jump Suit - Short",
    "price": 30
  },
  {
    "category": "Accessories",
    "subCategory": "Accessories",
    "name": "Leather - College Jacket",
    "price": 75.5
  },
  {
    "category": "Accessories",
    "subCategory": "Accessories",
    "name": "Priest Gown",
    "price": 27.5
  },
  {
    "category": "Accessories",
    "subCategory": "Accessories",
    "name": "Race Suit",
    "price": 55
  },
  {
    "category": "Accessories",
    "subCategory": "Accessories",
    "name": "Racing Jacket",
    "price": 33.5
  },
  {
    "category": "Accessories",
    "subCategory": "Accessories",
    "name": "Ski Gloves",
    "price": 12.5
  },
  {
    "category": "Accessories",
    "subCategory": "Accessories",
    "name": "Sleeping Bag",
    "price": 43
  },
  {
    "category": "Accessories",
    "subCategory": "Accessories",
    "name": "Track Suit",
    "price": 25.5
  },
  {
    "category": "Blazer",
    "subCategory": "Button",
    "name": "Blazer Move Button",
    "price": 7
  },
  {
    "category": "Blazer",
    "subCategory": "Dart",
    "name": "Blazer Dart Back",
    "price": 65
  },
  {
    "category": "Blazer",
    "subCategory": "Dry Cleaning",
    "name": "Dry Cleaning - Blazer",
    "price": 18
  },
  {
    "category": "Blazer",
    "subCategory": "Hem",
    "name": "Blazer Re-Hem",
    "price": 35
  },
  {
    "category": "Blazer",
    "subCategory": "Let Out",
    "name": "Blazer Let Out 2 Sides",
    "price": 95
  },
  {
    "category": "Blazer",
    "subCategory": "Let Out",
    "name": "Blazer Let Out Center Back",
    "price": 85
  },
  {
    "category": "Blazer",
    "subCategory": "Shorten",
    "name": "Shorten Blazer \\ Overcoat",
    "price": 95
  },
  {
    "category": "Blazer",
    "subCategory": "Shoulder",
    "name": "Blazer Shoulder Pads",
    "price": 45
  },
  {
    "category": "Blazer",
    "subCategory": "Shoulder",
    "name": "Blazer Taken In Shoulders",
    "price": 150
  },
  {
    "category": "Blazer",
    "subCategory": "Sleeves",
    "name": "Blazer Let Out Sleeves",
    "price": 65
  },
  {
    "category": "Blazer",
    "subCategory": "Sleeves",
    "name": "Blazer Shorten Sleeves",
    "price": 75
  },
  {
    "category": "Blazer",
    "subCategory": "Sleeves",
    "name": "Blazer Shorten Sleeves From Shoulder",
    "price": 150
  },
  {
    "category": "Blazer",
    "subCategory": "Sleeves",
    "name": "Blazer Shorten Sleeves Same Finish",
    "price": 85
  },
  {
    "category": "Blazer",
    "subCategory": "Take Down",
    "name": "Blazer Taken Down",
    "price": 95
  },
  {
    "category": "Blazer",
    "subCategory": "Take In",
    "name": "Blazer Taken In Center Back",
    "price": 75
  },
  {
    "category": "Blazer",
    "subCategory": "Take In",
    "name": "Blazer Taken In from side",
    "price": 85
  },
  {
    "category": "Blazer",
    "subCategory": "Taken In",
    "name": "Blazer Taken In from side with split",
    "price": 120
  },
  {
    "category": "Blouse",
    "subCategory": "Dart",
    "name": "Blouse Dart Back",
    "price": 45
  },
  {
    "category": "Blouse",
    "subCategory": "Let Out",
    "name": "Blouse Let Out",
    "price": 45
  },
  {
    "category": "Blouse",
    "subCategory": "Rehem",
    "name": "Blouse Rehem",
    "price": 25
  },
  {
    "category": "Blouse",
    "subCategory": "Shorten",
    "name": "Blouse Shorten Sleeves - with Cuff",
    "price": 55
  },
  {
    "category": "Blouse",
    "subCategory": "Shoulders",
    "name": "Blouse Taken In Shoulders",
    "price": 35
  },
  {
    "category": "Blouse",
    "subCategory": "Sleeves",
    "name": "Blouse Shorten Sleeves - Normal",
    "price": 35
  },
  {
    "category": "Blouse",
    "subCategory": "Straps",
    "name": "Blouse  / Top Shorten Straps - Normal",
    "price": 30
  },
  {
    "category": "Blouse",
    "subCategory": "Straps",
    "name": "Blouse / Tops Shorten Straps - Same Finish",
    "price": 45
  },
  {
    "category": "Blouse",
    "subCategory": "Take Down",
    "name": "Blouse Taken Down",
    "price": 35
  },
  {
    "category": "Blouse",
    "subCategory": "Take Down",
    "name": "Blouse Taken Down (with Split)",
    "price": 45
  },
  {
    "category": "Blouse",
    "subCategory": "Take In",
    "name": "Blouse Taken In",
    "price": 35
  },
  {
    "category": "Blouse",
    "subCategory": "Take Up",
    "name": "Blouse Taken Up",
    "price": 35
  },
  {
    "category": "Blouse",
    "subCategory": "Take Up",
    "name": "Blouse Taken Up (with Split)",
    "price": 55
  },
  {
    "category": "Button",
    "subCategory": "Button",
    "name": "Button",
    "price": 7
  },
  {
    "category": "Button",
    "subCategory": "Button",
    "name": "Stud button",
    "price": 15
  },
  {
    "category": "Button",
    "subCategory": "Hook",
    "name": "Hook And Eye",
    "price": 15
  },
  {
    "category": "Dress",
    "subCategory": "Dart",
    "name": "Dress Dart",
    "price": 55
  },
  {
    "category": "Dress",
    "subCategory": "Hem",
    "name": "Dress Hem Taken Down",
    "price": 65
  },
  {
    "category": "Dress",
    "subCategory": "Hem",
    "name": "Dress Hem Taken Down With Lining",
    "price": 75
  },
  {
    "category": "Dress",
    "subCategory": "Hem",
    "name": "Dress Hem Taken Up",
    "price": 55
  },
  {
    "category": "Dress",
    "subCategory": "Hem",
    "name": "Dress Hem UP With Lining",
    "price": 75
  },
  {
    "category": "Dress",
    "subCategory": "Let Out",
    "name": "Dress Let Out",
    "price": 55
  },
  {
    "category": "Dress",
    "subCategory": "Loop",
    "name": "Loop",
    "price": 10
  },
  {
    "category": "Dress",
    "subCategory": "Split",
    "name": "Dress Close Split",
    "price": 30
  },
  {
    "category": "Dress",
    "subCategory": "Straps",
    "name": "Dress Shorten Straps",
    "price": 45
  },
  {
    "category": "Dress",
    "subCategory": "Straps",
    "name": "Evening Dress Shorten Straps",
    "price": 55
  },
  {
    "category": "Dress",
    "subCategory": "Take In",
    "name": "Dress Take In Shoulders with Sleeves",
    "price": 55
  },
  {
    "category": "Dress",
    "subCategory": "Take In",
    "name": "Dress Taken In Both Sides with Zipper",
    "price": 85
  },
  {
    "category": "Dress",
    "subCategory": "Take In",
    "name": "Dress Taken in With Lining",
    "price": 65
  },
  {
    "category": "Elastic",
    "subCategory": "Elastic",
    "name": "Dress Elastic Waist",
    "price": 55
  },
  {
    "category": "Elastic",
    "subCategory": "Elastic",
    "name": "Elastic Waist Pants",
    "price": 45
  },
  {
    "category": "Evening / Formal",
    "subCategory": "Dart",
    "name": "Evening Dress Dart Front",
    "price": 55
  },
  {
    "category": "Evening / Formal",
    "subCategory": "Let Out",
    "name": "Evening / Formal Dress Let Out",
    "price": 75
  },
  {
    "category": "Evening / Formal",
    "subCategory": "Shorten",
    "name": "Evening / Formal Shorten Dress - Normal",
    "price": 75
  },
  {
    "category": "Evening / Formal",
    "subCategory": "Shorten",
    "name": "Evening Dress Shorten with Lining",
    "price": 85
  },
  {
    "category": "Evening / Formal",
    "subCategory": "Shoulder",
    "name": "Evening Dress Take In Shoulders",
    "price": 75
  },
  {
    "category": "Evening / Formal",
    "subCategory": "Take In",
    "name": "Evening \\ Formal Dress Taken in with Lining",
    "price": 95
  },
  {
    "category": "Evening / Formal",
    "subCategory": "Take In",
    "name": "Evening Dress Taken In - Normal",
    "price": 75
  },
  {
    "category": "Evening / Formal",
    "subCategory": "Take Up",
    "name": "Formal Dress Taken Up with Lining",
    "price": 95
  },
  {
    "category": "Household",
    "subCategory": "Bedspread",
    "name": "Bedspread - Double",
    "price": 40
  },
  {
    "category": "Household",
    "subCategory": "Bedspread",
    "name": "Bedspread - King",
    "price": 50.5
  },
  {
    "category": "Household",
    "subCategory": "Bedspread",
    "name": "Bedspread - Queen",
    "price": 44.5
  },
  {
    "category": "Household",
    "subCategory": "Bedspread",
    "name": "Bedspread - Single",
    "price": 37
  },
  {
    "category": "Household",
    "subCategory": "Blankets",
    "name": "Blanket - Double",
    "price": 32
  },
  {
    "category": "Household",
    "subCategory": "Blankets",
    "name": "Blanket - King",
    "price": 40
  },
  {
    "category": "Household",
    "subCategory": "Blankets",
    "name": "Blanket - Queen",
    "price": 34
  },
  {
    "category": "Household",
    "subCategory": "Blankets",
    "name": "Blanket - Single",
    "price": 26.5
  },
  {
    "category": "Household",
    "subCategory": "Blankets",
    "name": "Electric Blanket - King/Queen",
    "price": 48.5
  },
  {
    "category": "Household",
    "subCategory": "Blankets",
    "name": "Electric Blanket - Single/Double",
    "price": 40
  },
  {
    "category": "Household",
    "subCategory": "Car Covers",
    "name": "Car Back Seat Cover - Plain",
    "price": 51
  },
  {
    "category": "Household",
    "subCategory": "Car Covers",
    "name": "Car Back Seat Cover - Sheep Skin",
    "price": 73
  },
  {
    "category": "Household",
    "subCategory": "Car Covers",
    "name": "Car Seat Cover - Plain",
    "price": 35.5
  },
  {
    "category": "Household",
    "subCategory": "Car Covers",
    "name": "Car Seat Cover - Sheep Skin",
    "price": 57
  },
  {
    "category": "Household",
    "subCategory": "Couch Covers",
    "name": "2 Seat Couch Cover",
    "price": 55.5
  },
  {
    "category": "Household",
    "subCategory": "Couch Covers",
    "name": "3 Seat Couch Cover",
    "price": 73
  },
  {
    "category": "Household",
    "subCategory": "Couch Covers",
    "name": "Arm Rest",
    "price": 11.5
  },
  {
    "category": "Household",
    "subCategory": "Couch Covers",
    "name": "Armchair Cover",
    "price": 9.5
  },
  {
    "category": "Household",
    "subCategory": "Couch Covers",
    "name": "Single Chair Cover",
    "price": 22.5
  },
  {
    "category": "Household",
    "subCategory": "Couch Covers",
    "name": "Slip Cover - Large",
    "price": 47.5
  },
  {
    "category": "Household",
    "subCategory": "Couch Covers",
    "name": "Slip Cover - Medium",
    "price": 34
  },
  {
    "category": "Household",
    "subCategory": "Couch Covers",
    "name": "Slip Cover - Small",
    "price": 26.5
  },
  {
    "category": "Household",
    "subCategory": "Curtains",
    "name": "Curtains - Heavy Lined",
    "price": 35.5
  },
  {
    "category": "Household",
    "subCategory": "Curtains",
    "name": "Curtains - Heavy Unlined",
    "price": 33.5
  },
  {
    "category": "Household",
    "subCategory": "Curtains",
    "name": "Curtains - Light Lined",
    "price": 30
  },
  {
    "category": "Household",
    "subCategory": "Curtains",
    "name": "Curtains - Light Unlined",
    "price": 23.5
  },
  {
    "category": "Household",
    "subCategory": "Curtains",
    "name": "Curtains - Per Metre",
    "price": 12.5
  },
  {
    "category": "Household",
    "subCategory": "Curtains",
    "name": "Curtains - Rubber",
    "price": 35.5
  },
  {
    "category": "Household",
    "subCategory": "Cushion Covers",
    "name": "Cushion Cover - Extra Large",
    "price": 30
  },
  {
    "category": "Household",
    "subCategory": "Cushion Covers",
    "name": "Cushion Cover - Large",
    "price": 13.5
  },
  {
    "category": "Household",
    "subCategory": "Cushion Covers",
    "name": "Cushion Cover - Medium",
    "price": 9.5
  },
  {
    "category": "Household",
    "subCategory": "Cushion Covers",
    "name": "Cushion Cover - Small",
    "price": 6.5
  },
  {
    "category": "Household",
    "subCategory": "Dog Beds",
    "name": "Dog Bed - Large",
    "price": 55
  },
  {
    "category": "Household",
    "subCategory": "Dog Beds",
    "name": "Dog Bed - Small",
    "price": 45
  },
  {
    "category": "Household",
    "subCategory": "Doona",
    "name": "Doona - Double",
    "price": 40
  },
  {
    "category": "Household",
    "subCategory": "Doona",
    "name": "Doona - King",
    "price": 46.5
  },
  {
    "category": "Household",
    "subCategory": "Doona",
    "name": "Doona - Queen",
    "price": 44.5
  },
  {
    "category": "Household",
    "subCategory": "Doona",
    "name": "Doona - Single",
    "price": 37
  },
  {
    "category": "Household",
    "subCategory": "Doona Cover",
    "name": "Doona Cover - Double",
    "price": 29.5
  },
  {
    "category": "Household",
    "subCategory": "Doona Cover",
    "name": "Doona Cover - King",
    "price": 40
  },
  {
    "category": "Household",
    "subCategory": "Doona Cover",
    "name": "Doona Cover - Queen",
    "price": 34
  },
  {
    "category": "Household",
    "subCategory": "Doona Cover",
    "name": "Doona Cover - Single",
    "price": 26.5
  },
  {
    "category": "Household",
    "subCategory": "Pillow Case",
    "name": "Pillow Case",
    "price": 6
  },
  {
    "category": "Household",
    "subCategory": "Rugs",
    "name": "Rug - Large",
    "price": 132.5
  },
  {
    "category": "Household",
    "subCategory": "Rugs",
    "name": "Rug - Medium",
    "price": 77.5
  },
  {
    "category": "Household",
    "subCategory": "Rugs",
    "name": "Rug - Small",
    "price": 26.5
  },
  {
    "category": "Household",
    "subCategory": "Rugs",
    "name": "Throw Rug",
    "price": 23.5
  },
  {
    "category": "Household",
    "subCategory": "Rugs",
    "name": "Travel Rug",
    "price": 23.5
  },
  {
    "category": "Household",
    "subCategory": "Sheep Skin",
    "name": "Sheep Skin - Large",
    "price": 42.5
  },
  {
    "category": "Household",
    "subCategory": "Sheep Skin",
    "name": "Sheep Skin - Medium",
    "price": 37
  },
  {
    "category": "Household",
    "subCategory": "Sheep Skin",
    "name": "Sheep Skin - Small",
    "price": 32
  },
  {
    "category": "Household",
    "subCategory": "Sheets",
    "name": "Fitted Sheet",
    "price": 18
  },
  {
    "category": "Household",
    "subCategory": "Sheets",
    "name": "Sheets - Double",
    "price": 13.5
  },
  {
    "category": "Household",
    "subCategory": "Sheets",
    "name": "Sheets - King",
    "price": 15
  },
  {
    "category": "Household",
    "subCategory": "Sheets",
    "name": "Sheets - Queen",
    "price": 15
  },
  {
    "category": "Household",
    "subCategory": "Sheets",
    "name": "Sheets - Single",
    "price": 13
  },
  {
    "category": "Household",
    "subCategory": "Table Linen",
    "name": "Napkin",
    "price": 3.5
  },
  {
    "category": "Household",
    "subCategory": "Table Linen",
    "name": "Place Mat",
    "price": 10.5
  },
  {
    "category": "Household",
    "subCategory": "Table Linen",
    "name": "Table Cloth - Large",
    "price": 45
  },
  {
    "category": "Household",
    "subCategory": "Table Linen",
    "name": "Table Cloth - Medium",
    "price": 33.5
  },
  {
    "category": "Household",
    "subCategory": "Table Linen",
    "name": "Table Cloth - Small",
    "price": 32
  },
  {
    "category": "Household",
    "subCategory": "Table Linen",
    "name": "Table Runner - Long",
    "price": 35
  },
  {
    "category": "Household",
    "subCategory": "Table Linen",
    "name": "Table Runner - Short",
    "price": 25
  },
  {
    "category": "Household",
    "subCategory": "Underlay",
    "name": "Underlay - Double",
    "price": 48
  },
  {
    "category": "Household",
    "subCategory": "Underlay",
    "name": "Underlay - King",
    "price": 55
  },
  {
    "category": "Household",
    "subCategory": "Underlay",
    "name": "Underlay - Queen",
    "price": 52
  },
  {
    "category": "Household",
    "subCategory": "Underlay",
    "name": "Underlay - Single",
    "price": 37
  },
  {
    "category": "Pant",
    "subCategory": "Let Out",
    "name": "Pants West Let Out",
    "price": 35
  },
  {
    "category": "Pant",
    "subCategory": "Loop",
    "name": "Loop",
    "price": 15
  },
  {
    "category": "Pant",
    "subCategory": "Pocket",
    "name": "Pant Pocket Full",
    "price": 45
  },
  {
    "category": "Pant",
    "subCategory": "Pocket",
    "name": "Pant Pocket Half",
    "price": 25
  },
  {
    "category": "Pant",
    "subCategory": "Shorten",
    "name": "Jeans Shorten",
    "price": 25
  },
  {
    "category": "Pant",
    "subCategory": "Shorten",
    "name": "Jeans shorten Original Hem",
    "price": 45
  },
  {
    "category": "Pant",
    "subCategory": "Shorten",
    "name": "Pant Shorten",
    "price": 30
  },
  {
    "category": "Pant",
    "subCategory": "Shorten",
    "name": "Pant shortening (wide pants,jeans)",
    "price": 35
  },
  {
    "category": "Pant",
    "subCategory": "Shorten",
    "name": "Pants / Jeans Diffrent Leg Shorten Up \\ Down",
    "price": 35
  },
  {
    "category": "Pant",
    "subCategory": "Take Down",
    "name": "Pants Taken Down",
    "price": 30
  },
  {
    "category": "Pant",
    "subCategory": "Take In",
    "name": "Jeans  Taken In Waist",
    "price": 45
  },
  {
    "category": "Pant",
    "subCategory": "Take In",
    "name": "Pants Taken In  Legs One Side",
    "price": 35
  },
  {
    "category": "Pant",
    "subCategory": "Take In",
    "name": "Pants Taken In Legs Both Sides",
    "price": 45
  },
  {
    "category": "Pant",
    "subCategory": "Take In",
    "name": "Pants Taken In Waist",
    "price": 35
  },
  {
    "category": "Patch",
    "subCategory": "",
    "name": "Large Patch",
    "price": 35
  },
  {
    "category": "Patch",
    "subCategory": "",
    "name": "Medium Patch",
    "price": 25
  },
  {
    "category": "Patch",
    "subCategory": "",
    "name": "Small Patch",
    "price": 15
  },
  {
    "category": "Pocket",
    "subCategory": "Dress",
    "name": "Dress Pocket Full",
    "price": 45
  },
  {
    "category": "Pocket",
    "subCategory": "Pant",
    "name": "Pant Pocket Full",
    "price": 45
  },
  {
    "category": "Pocket",
    "subCategory": "Shirt",
    "name": "Shirt Pocket Full",
    "price": 25
  },
  {
    "category": "Repair",
    "subCategory": "",
    "name": "Repair",
    "price": 15
  },
  {
    "category": "Repair",
    "subCategory": "",
    "name": "Repair Extra Large",
    "price": 40
  },
  {
    "category": "Repair",
    "subCategory": "",
    "name": "Repair Large",
    "price": 35
  },
  {
    "category": "Repair",
    "subCategory": "",
    "name": "Repair Medium",
    "price": 30
  },
  {
    "category": "School",
    "subCategory": "Blazer",
    "name": "Blazer Shorten Sleeves (B2S )",
    "price": 55
  },
  {
    "category": "School",
    "subCategory": "Dress 👗",
    "name": "Dress Dart (B2S)",
    "price": 40
  },
  {
    "category": "School",
    "subCategory": "Dress 👗",
    "name": "Dress Hem Taken Down (B2S)",
    "price": 35
  },
  {
    "category": "School",
    "subCategory": "Dress 👗",
    "name": "Dress Taken  Up (B2S)",
    "price": 35
  },
  {
    "category": "School",
    "subCategory": "Elastic",
    "name": "Elastic waist (B2S)",
    "price": 35
  },
  {
    "category": "School",
    "subCategory": "Pants 👖",
    "name": "Pants let out (B2S)",
    "price": 35
  },
  {
    "category": "School",
    "subCategory": "Pants 👖",
    "name": "Pants Taken down (B2S)",
    "price": 30
  },
  {
    "category": "School",
    "subCategory": "Pants 👖",
    "name": "Pants Taken in legs (B2S)",
    "price": 45
  },
  {
    "category": "School",
    "subCategory": "Pants 👖",
    "name": "Pants Taken Up (B2S)",
    "price": 30
  },
  {
    "category": "School",
    "subCategory": "Shirt 👕",
    "name": "Shirt Shorten Sleeves (B2S)",
    "price": 35
  },
  {
    "category": "School",
    "subCategory": "Skirt",
    "name": "Skirt Taken Up",
    "price": 35
  },
  {
    "category": "School",
    "subCategory": "Skirt",
    "name": "Skirt Taken Up",
    "price": 40
  },
  {
    "category": "School",
    "subCategory": "Skirt",
    "name": "Skirts Taken In",
    "price": 35
  },
  {
    "category": "School",
    "subCategory": "Skirt",
    "name": "Skirts Taken In",
    "price": 45
  },
  {
    "category": "Shirt",
    "subCategory": "Collar",
    "name": "Replace The Collar",
    "price": 35
  },
  {
    "category": "Shirt",
    "subCategory": "Let Out",
    "name": "Shirt Let Out",
    "price": 35
  },
  {
    "category": "Shirt",
    "subCategory": "Loop",
    "name": "Shirt add Loop",
    "price": 10
  },
  {
    "category": "Shirt",
    "subCategory": "Sleeves",
    "name": "Shirt Shorten Sleeves with Split / Cuff",
    "price": 55
  },
  {
    "category": "Shirt",
    "subCategory": "Take Down",
    "name": "Shirt Taken Down",
    "price": 35
  },
  {
    "category": "Shirt",
    "subCategory": "Take Down",
    "name": "Shirt Taken Down with Split",
    "price": 55
  },
  {
    "category": "Shirt",
    "subCategory": "Take In",
    "name": "Shirt Take In",
    "price": 45
  },
  {
    "category": "Shirt",
    "subCategory": "Take In",
    "name": "Shirt Taken In with Dart",
    "price": 35
  },
  {
    "category": "Shirt",
    "subCategory": "Take Up",
    "name": "Polo Shirt Taken Up with Split",
    "price": 55
  },
  {
    "category": "Shirt",
    "subCategory": "Take Up",
    "name": "Shirt Taken Up",
    "price": 45
  },
  {
    "category": "Shirt",
    "subCategory": "Taken Up",
    "name": "Polo Shirt Taken Up",
    "price": 30
  },
  {
    "category": "Skirt",
    "subCategory": "Let Out",
    "name": "Skirt Let Out",
    "price": 45
  },
  {
    "category": "Skirt",
    "subCategory": "Rehem",
    "name": "Skirt Rehem",
    "price": 25
  },
  {
    "category": "Skirt",
    "subCategory": "Shorten",
    "name": "Skirts Hem Pleated Shorten",
    "price": 45
  },
  {
    "category": "Skirt",
    "subCategory": "Shorten",
    "name": "Skirts Hem Shorten",
    "price": 35
  },
  {
    "category": "Skirt",
    "subCategory": "Take Down",
    "name": "Skirt Taken Down",
    "price": 35
  },
  {
    "category": "Skirt",
    "subCategory": "Take In",
    "name": "Skirt Waist Taken In",
    "price": 35
  },
  {
    "category": "Skirt",
    "subCategory": "Take Up",
    "name": "Skirt Taken Up",
    "price": 45
  },
  {
    "category": "Skirt",
    "subCategory": "Take Up",
    "name": "Skirt Taken Up (With Lining)",
    "price": 55
  },
  {
    "category": "Trouser",
    "subCategory": "Let Out",
    "name": "Silk Trouser Let Out",
    "price": 45
  },
  {
    "category": "Trouser",
    "subCategory": "Let Out",
    "name": "Trouser Let out",
    "price": 35
  },
  {
    "category": "Trouser",
    "subCategory": "Let Out",
    "name": "Trouser Waist Let out",
    "price": 35
  },
  {
    "category": "Trouser",
    "subCategory": "Take Down",
    "name": "Trouser (Different Leg) Taken Down",
    "price": 35
  },
  {
    "category": "Trouser",
    "subCategory": "Take Down",
    "name": "Trouser Taken Down",
    "price": 35
  },
  {
    "category": "Trouser",
    "subCategory": "Take In",
    "name": "Silk Trouser Taken In Waist",
    "price": 45
  },
  {
    "category": "Trouser",
    "subCategory": "Take In",
    "name": "Trouser Taken In Legs With Both Side",
    "price": 45
  },
  {
    "category": "Trouser",
    "subCategory": "Take In",
    "name": "Trouser Taken In With Dart",
    "price": 45
  },
  {
    "category": "Trouser",
    "subCategory": "Take Up",
    "name": "Trouser Taken Up",
    "price": 35
  },
  {
    "category": "Trouser",
    "subCategory": "Take Up",
    "name": "Trouser Taken Up with Split",
    "price": 45
  },
  {
    "category": "Trouser",
    "subCategory": "Taken In",
    "name": "Trouser Taken In Legs from One Side",
    "price": 35
  },
  {
    "category": "Waist",
    "subCategory": "Waist",
    "name": "Waist In / Out Lined",
    "price": 55
  },
  {
    "category": "Wedding",
    "subCategory": "Bridesmaid",
    "name": "Wedding - Bridesmaid",
    "price": 79
  },
  {
    "category": "Wedding",
    "subCategory": "Preservation Box",
    "name": "Wedding Preservation Box",
    "price": 53
  },
  {
    "category": "Wedding",
    "subCategory": "Wedding",
    "name": "Wedding - Basic Long",
    "price": 414
  },
  {
    "category": "Wedding",
    "subCategory": "Wedding",
    "name": "Wedding - Basic Short",
    "price": 342
  },
  {
    "category": "Wedding",
    "subCategory": "Wedding",
    "name": "Wedding - Christening Gown",
    "price": 28
  },
  {
    "category": "Wedding",
    "subCategory": "Wedding",
    "name": "Wedding - Flower Girl",
    "price": 66.5
  },
  {
    "category": "Wedding",
    "subCategory": "Wedding",
    "name": "Wedding - Heavy Beads",
    "price": 496.5
  },
  {
    "category": "Wedding",
    "subCategory": "Wedding",
    "name": "Wedding - Light Beads",
    "price": 441.5
  },
  {
    "category": "Wedding",
    "subCategory": "Wedding",
    "name": "Wedding - Veil",
    "price": 44.5
  },
  {
    "category": "Zipper",
    "subCategory": "Cushion",
    "name": "Zipper Cushion",
    "price": 35
  },
  {
    "category": "Zipper",
    "subCategory": "Dress",
    "name": "Zipper Dress",
    "price": 45
  },
  {
    "category": "Zipper",
    "subCategory": "Invisible",
    "name": "Zip Invisible Long",
    "price": 55
  },
  {
    "category": "Zipper",
    "subCategory": "Invisible",
    "name": "Zip Invisible Pant",
    "price": 45
  },
  {
    "category": "Zipper",
    "subCategory": "Jacket",
    "name": "Zipper Jacket",
    "price": 65
  },
  {
    "category": "Zipper",
    "subCategory": "Jeans",
    "name": "Zipper Jeans",
    "price": 45
  },
  {
    "category": "Zipper",
    "subCategory": "Pant",
    "name": "Zipper Pants",
    "price": 35
  },
  {
    "category": "Zipper",
    "subCategory": "Skirt",
    "name": "Zipper Skirts",
    "price": 45
  },
  {
    "category": "Zipper",
    "subCategory": "Zipper",
    "name": "Zipper",
    "price": 45
  }
]

export const DC_ITEMS: TemplateItem[] = [
  {
    "category": "Dry Cleaning",
    "subCategory": "*Deluxe*",
    "name": "**White Garment Care**",
    "price": 5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "*Deluxe*",
    "name": "Cashmere",
    "price": 5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "*Deluxe*",
    "name": "Deluxe Service",
    "price": 5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "*Deluxe*",
    "name": "Silk",
    "price": 5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Accessories",
    "name": "Chef's Jacket",
    "price": 13.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Accessories",
    "name": "Dental Gown",
    "price": 14.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Accessories",
    "name": "Hat / Cap",
    "price": 13
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Accessories",
    "name": "Jump Suit - Long",
    "price": 34
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Accessories",
    "name": "Jump Suit - Short",
    "price": 30
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Accessories",
    "name": "Priest Gown",
    "price": 27.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Accessories",
    "name": "Race Suit",
    "price": 55
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Accessories",
    "name": "Racing Jacket",
    "price": 33.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Accessories",
    "name": "Rubber Shoes",
    "price": 26.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Accessories",
    "name": "Sleeping Bag",
    "price": 43
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Blazer",
    "name": "Blazer",
    "price": 18
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Blouse",
    "name": "Blouse - Camilla",
    "price": 34
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Blouse",
    "name": "Blouse - Fancy",
    "price": 18
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Blouse",
    "name": "Blouse - Long",
    "price": 17
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Blouse",
    "name": "Blouse - Long Fancy",
    "price": 18
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Blouse",
    "name": "Blouse - Plain",
    "price": 16
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Blouse",
    "name": "Blouse - Plain Cotton",
    "price": 12.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Blouse",
    "name": "Blouse - Silk",
    "price": 20
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Camping",
    "name": "Sleeping Bag",
    "price": 48
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Cardigans",
    "name": "Cardigan - Angora",
    "price": 18.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Cardigans",
    "name": "Cardigan - Bulky",
    "price": 20
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Cardigans",
    "name": "Cardigan - Cashmere",
    "price": 23.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Cardigans",
    "name": "Cardigan - Fancy",
    "price": 14
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Cardigans",
    "name": "Cardigan - Long",
    "price": 23.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Cardigans",
    "name": "Cardigan - Plain",
    "price": 18.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Cardigans",
    "name": "Cardigan - Woolen",
    "price": 13.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Cardigans",
    "name": "Kilt",
    "price": 33.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Cardigans",
    "name": "Pashmina",
    "price": 31
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Cardigans",
    "name": "Sari",
    "price": 83
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Cardigans",
    "name": "Shawl",
    "price": 20
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Cardigans",
    "name": "Shawl - Pashmina",
    "price": 35
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Cardigans",
    "name": "Shawl - Woolen",
    "price": 25
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Coat",
    "name": "Coat - 3/4 Heavy",
    "price": 30
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Coat",
    "name": "Coat - 3/4 Light",
    "price": 27
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Coat",
    "name": "Coat - Basic",
    "price": 25
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Coat",
    "name": "Coat - Basic Heavy",
    "price": 27
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Coat",
    "name": "Coat - Graduation",
    "price": 32.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Coat",
    "name": "Coat - Long Winter",
    "price": 32.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Coat",
    "name": "Coat - Mink",
    "price": 80
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Coat",
    "name": "Coat - Overcoat",
    "price": 38
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Coat",
    "name": "Coat - Rain",
    "price": 30
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Coat",
    "name": "Coat - S Coat (from $32)",
    "price": 32
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Coat",
    "name": "Coat - T Coat (from $38)",
    "price": 38
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Coat",
    "name": "Coat - Tail",
    "price": 27
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Coat",
    "name": "Coat - Trench",
    "price": 32
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Camilla Long",
    "price": 54
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Camilla Short",
    "price": 42.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Cocktail Long",
    "price": 52
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Cocktail Short",
    "price": 34.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Evening (Long)",
    "price": 55
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Evening (Short)",
    "price": 48
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Evening Long",
    "price": 55
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Evening Short",
    "price": 48
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Fancy Long",
    "price": 68
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Fancy Short",
    "price": 40.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Standard (Long)",
    "price": 48
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Standard (Short)",
    "price": 34
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Standard Long",
    "price": 47.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dress - Standard Short",
    "price": 33.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Dress",
    "name": "Dressing Gown",
    "price": 26.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Bedspread (Double)",
    "price": 40
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Bedspread (King)",
    "price": 52
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Bedspread (Queen)",
    "price": 42
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Bedspread (Single)",
    "price": 38
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Blanket (Double)",
    "price": 35
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Blanket (King)",
    "price": 40
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Blanket (Queen)",
    "price": 38
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Blanket (Single)",
    "price": 26
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Curtains (per Meter)",
    "price": 35
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Dog Bed (Large)",
    "price": 45
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Dog Bed (Small)",
    "price": 35
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Doona (Double)",
    "price": 40
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Doona (King)",
    "price": 48
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Doona (Queen)",
    "price": 45
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Doona (Single)",
    "price": 38
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Doona Cover     (King)",
    "price": 40
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Doona Cover  (Single)",
    "price": 28
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Doona Cover (Double)",
    "price": 30
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Doona Cover (Queen)",
    "price": 38
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Pillow Case",
    "price": 8
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Sheets (Double)",
    "price": 15
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Sheets (King)",
    "price": 18
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Sheets (Queen)",
    "price": 16
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Household",
    "name": "Household - Sheets (Single)",
    "price": 14
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Hoodie - Bulky",
    "price": 26.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - 3/4",
    "price": 20
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Anorak",
    "price": 23.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Heavy",
    "price": 25
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Ladies",
    "price": 20
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Long",
    "price": 29.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Mink",
    "price": 80
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Overcoat",
    "price": 36.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Parka Long",
    "price": 27.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Parka Short",
    "price": 23.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Plain",
    "price": 15
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Sports",
    "price": 17
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Suit",
    "price": 18
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Suit Long",
    "price": 25.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Suit Short",
    "price": 15.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Jacket - Wind",
    "price": 19
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Leather / Suede Jacket",
    "price": 130
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Puffer Jacket - Large",
    "price": 38.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jacket",
    "name": "Puffer Jacket - Small",
    "price": 28.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jumper",
    "name": "Jumper - Bulky",
    "price": 19.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jumper",
    "name": "Jumper - Cashmere",
    "price": 25
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jumper",
    "name": "Jumper - Fancy",
    "price": 22.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jumper",
    "name": "Jumper - Heavy",
    "price": 20
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jumper",
    "name": "Jumper - Leather Trim",
    "price": 39
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jumper",
    "name": "Jumper - Long",
    "price": 17
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jumper",
    "name": "Jumper - Mohair",
    "price": 17.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jumper",
    "name": "Jumper - Plain",
    "price": 16
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Jumper",
    "name": "Jumper - Woolen",
    "price": 20
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - 3/4 Coat",
    "price": 131
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Car Seat Cover (Sheepskin)",
    "price": 54.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - College Jacket",
    "price": 75.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Dress",
    "price": 120.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Gloves",
    "price": 45.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Hand Bag",
    "price": 83
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Hand Bag Small",
    "price": 50
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Jacket",
    "price": 108.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Kids",
    "price": 54.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Long Skirt",
    "price": 141.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Overcoat",
    "price": 142
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Pants",
    "price": 108.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Pants / Leather Trim",
    "price": 75.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Shorts",
    "price": 84
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Skirt Short",
    "price": 84
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "L&S - Vest",
    "price": 78.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "Leather - 3/4 Coat",
    "price": 135
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "Leather - Dress",
    "price": 120
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "Leather - Gloves",
    "price": 48
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "Leather - Jacket",
    "price": 130
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "Leather - Overcoat",
    "price": 145
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "Leather - Pants",
    "price": 110
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "Leather - Skirt (Long)",
    "price": 145
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "Leather - Skirt (Short)",
    "price": 85
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Leather",
    "name": "Leather - Vest",
    "price": 80
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Pant",
    "name": "Pant",
    "price": 18
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Pant",
    "name": "Pant - Jeans",
    "price": 18
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Pant",
    "name": "Pant - Shorts",
    "price": 15
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "School",
    "name": "School - Backpack",
    "price": 28
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "School",
    "name": "School - Band Blazer",
    "price": 17
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "School",
    "name": "School - Blazer",
    "price": 20
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "School",
    "name": "School - Dress",
    "price": 18
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "School",
    "name": "School - Hat",
    "price": 11
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "School",
    "name": "School - Jumper",
    "price": 16
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "School",
    "name": "School - Kilt",
    "price": 33.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "School",
    "name": "School - Shorts",
    "price": 15
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "School",
    "name": "School - Skirt",
    "price": 15
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "School",
    "name": "School - Tie",
    "price": 8
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "School",
    "name": "School - Trouser",
    "price": 16
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "School",
    "name": "School - Tunic",
    "price": 13.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shirt",
    "name": "Shirt - Business",
    "price": 9
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shirt",
    "name": "Shirt - Cadet",
    "price": 10.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shirt",
    "name": "Shirt - Casual",
    "price": 9.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shirt",
    "name": "Shirt - Dress",
    "price": 10.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shirt",
    "name": "Shirt - Not Button Down",
    "price": 9.7
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shirt",
    "name": "Shirt - Polo",
    "price": 9.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shirt",
    "name": "Shirt - Silk",
    "price": 15.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shirt",
    "name": "Shirt (1 or 2)",
    "price": 8
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shirt",
    "name": "Shirt (5 or more)",
    "price": 6
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shirt",
    "name": "Shirt (less than 5)",
    "price": 7
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shirt",
    "name": "Shirt + 5 Dry Clean",
    "price": 10
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shirt",
    "name": "T-Shirt",
    "price": 10
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shirt",
    "name": "T-Shirt + 5 Bulk",
    "price": 9.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shorts",
    "name": "Shorts - Ladies",
    "price": 12.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Shorts",
    "name": "Shorts - Men",
    "price": 12.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Skirt",
    "name": "Skirt",
    "price": 18
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Skirt",
    "name": "Skirt - Box Pleated",
    "price": 24.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Skirt",
    "name": "Skirt - Fancy",
    "price": 17
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Skirt",
    "name": "Skirt - Formal",
    "price": 28
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Skirt",
    "name": "Skirt - Full Pleated",
    "price": 28
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Skirt",
    "name": "Skirt - Long",
    "price": 20
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Skirt",
    "name": "Skirt - Pleated",
    "price": 28
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Skirt",
    "name": "Skirt - Semi Pleat",
    "price": 15.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Skirt",
    "name": "Skirt - Short",
    "price": 16
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Skirt",
    "name": "Skirt - Sunray Pleat",
    "price": 28
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Suit",
    "name": "Suit - 3 Piece",
    "price": 42
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Suit",
    "name": "Suit - 3 Pieces (Jacket + Trouser + Vest)",
    "price": 48
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Suit",
    "name": "Suit - Dinner",
    "price": 36.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Suit",
    "name": "Suit - Dinner (Jacket + Trouser)",
    "price": 42
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Suit",
    "name": "Suit - Ladies",
    "price": 28.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Suit",
    "name": "Suit - Ladies (Jacket + Trouser)",
    "price": 38
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Suit",
    "name": "Suit - Men (Jacket + Trouser)",
    "price": 38
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Suit",
    "name": "Suit - Mens",
    "price": 28.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Suit",
    "name": "Suit - Ski",
    "price": 59
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Suit",
    "name": "Suit - Tails",
    "price": 31
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Suit",
    "name": "Suit - Uniform",
    "price": 28.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Tie",
    "name": "Scarf",
    "price": 14.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Tie",
    "name": "Scarf - Long",
    "price": 17
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Tie",
    "name": "Tie - Plain",
    "price": 12
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Tie",
    "name": "Tie - Scarf",
    "price": 15
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Tie",
    "name": "Tie - Silk",
    "price": 14.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Trouser",
    "name": "Trouser",
    "price": 18
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Trouser",
    "name": "Trouser - Cadet",
    "price": 14
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Trouser",
    "name": "Trouser - Jeans",
    "price": 14.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Trouser",
    "name": "Trouser - Jogger",
    "price": 14.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Trouser",
    "name": "Trouser - Ladies",
    "price": 14.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Trouser",
    "name": "Trouser - Light",
    "price": 15.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Trouser",
    "name": "Trouser - Mens",
    "price": 14.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Trouser",
    "name": "Trouser - Plain",
    "price": 14.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Trouser",
    "name": "Trouser - Ski",
    "price": 30
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Trouser",
    "name": "Trouser - Wide",
    "price": 16.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Vest",
    "name": "Vest",
    "price": 18
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Vest",
    "name": "Vest - Long",
    "price": 16.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Vest",
    "name": "Vest - Parka",
    "price": 17.5
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Wedding",
    "name": "Preservation Box",
    "price": 120
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Wedding",
    "name": "Veil",
    "price": 60
  },
  {
    "category": "Dry Cleaning",
    "subCategory": "Wedding",
    "name": "Wedding Dress Clean",
    "price": 350
  }
]
