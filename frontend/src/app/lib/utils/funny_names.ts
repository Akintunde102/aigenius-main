const adjectives = [
    "Ajebo", "Wahala", "Sabi", "Kolo", "JagaJaga", "OshoFree", "Ginger", "Sharp", "Area", "Slay", "Tush", "Omo", "Gbam", "Kasala", "Yarn", "Beta", "Fashi", "Parole", "SoroSoke", "WetinDey", "GbeBody", "Oga", "Padi", "Amebo", "Swagga", "Jaiye", "Zanku", "Lamba", "EChoke", "NoWahala", "Kpef", "Bamilo", "Jor", "Correct", "Scatter", "Tuale", "Abeg", "Ewo", "Ogbonge", "Jazzy", "Pako", "Woke", "Shine",

    "Wakanda", "Jedi", "Vibranium", "Batman", "Superman", "IronMan", "Captain", "Loki", "Wolverine", "Deadpool", "Ninja", "Samurai", "Katana", "Django", "Bond", "Gollum", "Yoda", "Vader", "ObiWan", "Kenobi", "Spidey", "Flash", "Quicksilver", "Hulk", "Thor", "DrStrange", "Shazam", "Venom", "Morpheus", "Trinity", "Scarface", "Rocky", "Creed", "Adonis", "Apollo", "Drago", "Maverick", "TopGun", "EthanHunt", "JackSparrow", "DavyJones", "Kratos", "Zeus", "Ares", "Athena", "Poseidon", "Achilles", "Odysseus", "Percy", "Annabeth", "Hermione", "Voldemort", "Snape", "Dumbledore", "Gandalf", "Sauron", "Aragorn", "Legolas", "Gimli", "Boromir", "Saruman", "Elrond", "Galadriel", "Eowyn", "Theoden", "Faramir", "Pippin", "Merry", "Samwise", "Bilbo", "Euron", "Oberyn", "Tyrion", "Cersei", "Jaime", "Brienne", "Hodor", "JonSnow", "Ghost", "Arya", "Sansa", "Ned", "Robb", "Stannis", "Renly", "Melisandre", "Davos", "Greyjoy", "Bolton", "Tormund", "Bran", "Rickon", "TheMountain", "TheHound", "Varys", "Littlefinger", "Daario", "Missandei", "Jorah", "Drogo", "Rhaegar", "Aegon", "Viserys", "Daenerys", "Drogon", "Rhaegal", "Viserion"
];

const nouns = [
    "Plantain", "Yam", "Toaster", "Pancake", "Noodle", "Coconut", "Pap", "Fufu", "Akara", "MoiMoi", "Ewedu", "Tuwo", "Okro", "Egusi", "Ogbono", "Amala", "Jollof", "FriedRice", "PepperSoup", "Gizzard", "Kilishi", "Suya", "Boli", "Kunu", "Zobo", "PuffPuff", "ChinChin", "MeatPie", "ScotchEgg", "ChickenPie", "IceCream", "Cupcake", "Brownie", "Cookies", "Banana", "Apple", "Orange", "Mango", "Pineapple", "Grapes", "Strawberry", "Guava", "Pawpaw", "Watermelon", "Cucumber", "Tomato", "Onion", "Carrot", "Beetroot", "Spinach", "Lettuce", "Cabbage", "Broccoli", "Cauliflower", "Peas", "Beans", "Lentils", "Rice", "Spaghetti", "Macaroni", "Cheese", "Butter", "Milk", "Yoghurt", "Chocolate", "Candy", "Popcorn", "Chips", "Burger", "Pizza", "Sandwich", "HotDog", "Taco", "Burrito", "Shawarma", "Kebab", "Samosa", "SpringRoll", "ChickenWings", "BBQ", "Grill", "FriedChicken", "Roast", "Stew", "Curry", "Sauce", "Soup", "Bread", "Rolls", "Bagel", "Croissant", "Muffin", "Pancake", "Waffle", "Crepe", "Doughnut", "Pie", "Tart", "Pastry", "Custard", "Pudding", "Cake", "IceLolly", "Popsicle", "Fudge", "Marshmallow", "Gingerbread", "Pancakes", "Cereal", "Oats", "Granola", "Porridge",
];

export function getRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generateFunnyName(): string {
    const adjective = getRandomElement(adjectives);
    const noun = getRandomElement(nouns);
    return `${adjective} ${noun}`;
}

