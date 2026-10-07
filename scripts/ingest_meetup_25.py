"""
Ingest Meetup #25 discussions and books into book_club_archivist.db.
Extracts all books, authors, and Goodreads links from BBB Meetup-9.txt,
links the Art Studio venue, attendance count, and enriches metadata.
"""

import os
import sys
import uuid
import re
from datetime import datetime

# Set up project path
sys.path.insert(0, os.path.abspath("."))

from app.core.database import SessionLocal
from app.database.models import (
    Meetup, CanonicalBook, Author, Discussion, ImportedBook, Venue, Source
)

# Raw list parsed directly from BBB Meetup-9.txt lines 1314-1399
MEETUP_25_BOOKS = [
    {
        "raw_text": "Mistborn-The Final Empire",
        "title": "Mistborn: The Final Empire",
        "author": "Brandon Sanderson",
        "url": "https://www.goodreads.com/book/show/68428.The_Final_Empire",
        "goodreads_id": "68428",
    },
    {
        "raw_text": "The Righteous Mind",
        "title": "The Righteous Mind: Why Good People Are Divided by Politics and Religion",
        "author": "Jonathan Haidt",
        "url": "https://www.goodreads.com/book/show/11324722-the-righteous-mind",
        "goodreads_id": "11324722",
    },
    {
        "raw_text": "Mythos",
        "title": "Mythos",
        "author": "Stephen Fry",
        "url": "https://www.goodreads.com/book/show/35074096-mythos",
        "goodreads_id": "35074096",
    },
    {
        "raw_text": "Heroes",
        "title": "Heroes",
        "author": "Stephen Fry",
        "url": "https://www.goodreads.com/book/show/41433634-heroes",
        "goodreads_id": "41433634",
    },
    {
        "raw_text": "American Gods",
        "title": "American Gods",
        "author": "Neil Gaiman",
        "url": "https://www.goodreads.com/book/show/30165203-american-gods",
        "goodreads_id": "30165203",
    },
    {
        "raw_text": "The Color of Magic(Discworld#1)",
        "title": "The Color of Magic",
        "author": "Terry Pratchett",
        "url": "https://www.goodreads.com/book/show/34497.The_Color_of_Magic",
        "goodreads_id": "34497",
    },
    {
        "raw_text": "The Light Fantastic(Discworld#2)",
        "title": "The Light Fantastic",
        "author": "Terry Pratchett",
        "url": "https://www.goodreads.com/book/show/34506.The_Light_Fantastic",
        "goodreads_id": "34506",
    },
    {
        "raw_text": "Mort(Discworld#4)",
        "title": "Mort",
        "author": "Terry Pratchett",
        "url": "https://www.goodreads.com/book/show/386372.Mort",
        "goodreads_id": "386372",
    },
    {
        "raw_text": "Equal Rites(Discworld#3)",
        "title": "Equal Rites",
        "author": "Terry Pratchett",
        "url": "https://www.goodreads.com/book/show/34507.Equal_Rites",
        "goodreads_id": "34507",
    },
    {
        "raw_text": "A darker shade of magic",
        "title": "A Darker Shade of Magic",
        "author": "V.E. Schwab",
        "url": "https://www.goodreads.com/book/show/22055262-a-darker-shade-of-magic",
        "goodreads_id": "22055262",
    },
    {
        "raw_text": "The Lies of Locke Lamora",
        "title": "The Lies of Locke Lamora",
        "author": "Scott Lynch",
        "url": "https://www.goodreads.com/book/show/29588376-the-lies-of-locke-lamora",
        "goodreads_id": "29588376",
    },
    {
        "raw_text": "Pawan the flying accountant",
        "title": "Pawan: The Flying Accountant",
        "author": "Sorabh Pant",
        "url": "https://www.goodreads.com/book/show/36643047-pawan",
        "goodreads_id": "36643047",
    },
    {
        "raw_text": "Percy Jackson",
        "title": "Percy Jackson & the Olympians (Series)",
        "author": "Rick Riordan",
        "url": "https://www.goodreads.com/series/40736-percy-jackson-and-the-olympians",
        "goodreads_id": None,
    },
    {
        "raw_text": "The Witcher series",
        "title": "The Witcher Series",
        "author": "Andrzej Sapkowski",
        "url": "https://www.goodreads.com/series/40911-the-witcher",
        "goodreads_id": None,
    },
    {
        "raw_text": "Malazan",
        "title": "Malazan Book of the Fallen",
        "author": "Steven Erikson",
        "url": "https://www.goodreads.com/series/43493-malazan-book-of-the-fallen",
        "goodreads_id": None,
    },
    {
        "raw_text": "The palace of illusions",
        "title": "The Palace of Illusions",
        "author": "Chitra Banerjee Divakaruni",
        "url": "https://www.goodreads.com/book/show/1774836.The_Palace_of_Illusions",
        "goodreads_id": "1774836",
    },
    {
        "raw_text": "Fountainhead",
        "title": "The Fountainhead",
        "author": "Ayn Rand",
        "url": "https://www.goodreads.com/book/show/2122.The_Fountainhead",
        "goodreads_id": "2122",
    },
    {
        "raw_text": "Atlas Shrugged",
        "title": "Atlas Shrugged",
        "author": "Ayn Rand",
        "url": "https://www.goodreads.com/book/show/662.Atlas_Shrugged",
        "goodreads_id": "662",
    },
    {
        "raw_text": "Pride & Prejudice",
        "title": "Pride and Prejudice",
        "author": "Jane Austen",
        "url": "https://www.goodreads.com/book/show/1885.Pride_and_Prejudice",
        "goodreads_id": "1885",
    },
    {
        "raw_text": "The Hungry Tide",
        "title": "The Hungry Tide",
        "author": "Amitav Ghosh",
        "url": "https://www.goodreads.com/book/show/4950.The_Hungry_Tide",
        "goodreads_id": "4950",
    },
    {
        "raw_text": "Sita",
        "title": "Sita: An Illustrated Retelling of the Ramayana",
        "author": "Devdutt Pattanaik",
        "url": "https://www.goodreads.com/en/book/show/18514068",
        "goodreads_id": "18514068",
    },
    {
        "raw_text": "Half the night is gone",
        "title": "Half the Night is Gone",
        "author": "Amitabha Bagchi",
        "url": "https://www.goodreads.com/en/book/show/40506766",
        "goodreads_id": "40506766",
    },
    {
        "raw_text": "Arthur Conan Doyle",
        "title": "The Complete Works of Arthur Conan Doyle",
        "author": "Arthur Conan Doyle",
        "url": "https://www.goodreads.com/book/show/4947464-complete-works-of-arthur-conan-doyle",
        "goodreads_id": "4947464",
    },
    {
        "raw_text": "Byomkesh Bakshi stories",
        "title": "Byomkesh Bakshi Stories",
        "author": "Sharadindu Bandyopadhyay",
        "url": "https://www.goodreads.com/book/show/5968988-byomkesh-bakshi-stories",
        "goodreads_id": "5968988",
    },
    {
        "raw_text": "Feluda",
        "title": "The Complete Adventures of Feluda",
        "author": "Satyajit Ray",
        "url": "https://www.goodreads.com/book/show/244524.The_Complete_Adventures_of_Feluda_Vol_1",
        "goodreads_id": "244524",
    },
    {
        "raw_text": "Tenida",
        "title": "Tenida Samagra",
        "author": "Narayan Gangopadhyay",
        "url": "https://www.goodreads.com/en/book/show/21530643",
        "goodreads_id": "21530643",
    },
    {
        "raw_text": "Metamorphosis",
        "title": "The Metamorphosis",
        "author": "Franz Kafka",
        "url": "https://www.goodreads.com/book/show/485894.The_Metamorphosis",
        "goodreads_id": "485894",
    },
    {
        "raw_text": "Tom sawyer",
        "title": "The Adventures of Tom Sawyer",
        "author": "Mark Twain",
        "url": "https://www.goodreads.com/book/show/24583.The_Adventures_of_Tom_Sawyer",
        "goodreads_id": "24583",
    },
    {
        "raw_text": "Kite Runner",
        "title": "The Kite Runner",
        "author": "Khaled Hosseini",
        "url": "https://www.goodreads.com/book/show/77203.The_Kite_Runner",
        "goodreads_id": "77203",
    },
    {
        "raw_text": "Norwegian Wood",
        "title": "Norwegian Wood",
        "author": "Haruki Murakami",
        "url": "https://www.goodreads.com/book/show/11297.Norwegian_Wood",
        "goodreads_id": "11297",
    },
    {
        "raw_text": "Manto : Selected Stories",
        "title": "Manto: Selected Stories",
        "author": "Saadat Hasan Manto",
        "url": "https://www.goodreads.com/book/show/7518598-manto",
        "goodreads_id": "7518598",
    },
    {
        "raw_text": "Joy in Coorg",
        "title": "Joy in Coorg",
        "author": "C.P. Belliappa",
        "url": "https://www.goodreads.com/book/show/43607163-joy-in-coorg",
        "goodreads_id": "43607163",
    },
    {
        "raw_text": "Darkness",
        "title": "Darkness",
        "author": "Ratnakar Matkari",
        "url": "https://www.goodreads.com/book/show/48457862-darkness",
        "goodreads_id": "48457862",
    },
    {
        "raw_text": "Truck de India",
        "title": "Truck de India!: A Hitchhiker's Guide to Hindustan",
        "author": "Rajat Ubhaykar",
        "url": "https://www.goodreads.com/book/show/48066403-truck-de-india",
        "goodreads_id": "48066403",
    },
    {
        "raw_text": "Secular common sense",
        "title": "Secular Common Sense",
        "author": "Mukul Kesavan",
        "url": "https://www.goodreads.com/book/show/1743582.Secular_Common_Sense",
        "goodreads_id": "1743582",
    },
    {
        "raw_text": "The Picture of Dorian Gray",
        "title": "The Picture of Dorian Gray",
        "author": "Oscar Wilde",
        "url": "https://www.goodreads.com/book/show/5297.The_Picture_of_Dorian_Gray",
        "goodreads_id": "5297",
    },
    {
        "raw_text": "The Strange Case of Dr Jekyll & Mr Hyde",
        "title": "The Strange Case of Dr Jekyll and Mr Hyde",
        "author": "Robert Louis Stevenson",
        "url": "https://www.goodreads.com/book/show/51496.The_Strange_Case_of_Dr_Jekyll_and_Mr_Hyde",
        "goodreads_id": "51496",
    },
    {
        "raw_text": "Cosmos",
        "title": "Cosmos",
        "author": "Carl Sagan",
        "url": "https://www.goodreads.com/book/show/55030.Cosmos",
        "goodreads_id": "55030",
    },
    {
        "raw_text": "Why Zebras don’t get ulcers",
        "title": "Why Zebras Don't Get Ulcers",
        "author": "Robert M. Sapolsky",
        "url": "https://www.goodreads.com/book/show/327.Why_Zebras_Don_t_Get_Ulcers",
        "goodreads_id": "327",
    },
    {
        "raw_text": "Phantoms in the Brain",
        "title": "Phantoms in the Brain: Probing the Mysteries of the Human Mind",
        "author": "V.S. Ramachandran",
        "url": "https://www.goodreads.com/book/show/31555.Phantoms_in_the_Brain",
        "goodreads_id": "31555",
    },
    {
        "raw_text": "The Greatest Show on the Earth",
        "title": "The Greatest Show on Earth: The Evidence for Evolution",
        "author": "Richard Dawkins",
        "url": "https://www.goodreads.com/book/show/6117055-the-greatest-show-on-earth",
        "goodreads_id": "6117055",
    },
    {
        "raw_text": "Re-origin of species (?)",
        "title": "The Re-Origin of Species: A Second Chance for Extinct Animals",
        "author": "Torill Kornfeldt",
        "url": "https://www.goodreads.com/book/show/36373722-the-re-origin-of-species",
        "goodreads_id": "36373722",
    },
    {
        "raw_text": "Lost Transmissions (?)",
        "title": "Lost Transmissions: The Secret History of Science Fiction and Fantasy",
        "author": "Desirina Boskovich",
        "url": "https://www.goodreads.com/book/show/43261168-lost-transmissions",
        "goodreads_id": "43261168",
    },
    {
        "raw_text": "THX 1138",
        "title": "THX 1138",
        "author": "Ben Bova",
        "url": "https://www.goodreads.com/book/show/35694519-thx-1138",
        "goodreads_id": "35694519",
    },
    {
        "raw_text": "Divergent Series",
        "title": "Divergent Series",
        "author": "Veronica Roth",
        "url": "https://www.goodreads.com/series/57530-divergent",
        "goodreads_id": None,
    },
    {
        "raw_text": "Eleanor Oliphant is completely fine",
        "title": "Eleanor Oliphant Is Completely Fine",
        "author": "Gail Honeyman",
        "url": "https://www.goodreads.com/book/show/31434883-eleanor-oliphant-is-completely-fine",
        "goodreads_id": "31434883",
    },
    {
        "raw_text": "Munnu",
        "title": "Munnu: A Boy from Kashmir",
        "author": "Malik Sajad",
        "url": "https://www.goodreads.com/en/book/show/25394441",
        "goodreads_id": "25394441",
    },
    {
        "raw_text": "The Nine chambered heart",
        "title": "The Nine-Chambered Heart",
        "author": "Janice Pariat",
        "url": "https://www.goodreads.com/book/show/36396222-the-nine-chambered-heart",
        "goodreads_id": "36396222",
    },
    {
        "raw_text": "Daura",
        "title": "Daura",
        "author": "Anukrti Upadhyay",
        "url": "https://www.goodreads.com/book/show/46016752-daura",
        "goodreads_id": "46016752",
    },
    {
        "raw_text": "Hippie",
        "title": "Hippie",
        "author": "Paulo Coelho",
        "url": "https://www.goodreads.com/book/show/39731666-hippie",
        "goodreads_id": "39731666",
    },
    {
        "raw_text": "Bombay Brides",
        "title": "Bombay Brides",
        "author": "Kavita Daswani",
        "url": "https://www.goodreads.com/book/show/40041682-bombay-brides",
        "goodreads_id": "40041682",
    },
    {
        "raw_text": "Women (Charles Bukowski)",
        "title": "Women",
        "author": "Charles Bukowski",
        "url": "https://www.goodreads.com/book/show/38500.Women",
        "goodreads_id": "38500",
    },
    {
        "raw_text": "Shantaram",
        "title": "Shantaram",
        "author": "Gregory David Roberts",
        "url": "https://www.goodreads.com/book/show/33600.Shantaram",
        "goodreads_id": "33600",
    },
    {
        "raw_text": "2001: A Space Odyssey",
        "title": "2001: A Space Odyssey",
        "author": "Arthur C. Clarke",
        "url": "https://www.goodreads.com/book/show/70535.2001",
        "goodreads_id": "70535",
    },
    {
        "raw_text": "The Left hand of darkness",
        "title": "The Left Hand of Darkness",
        "author": "Ursula K. Le Guin",
        "url": "https://www.goodreads.com/book/show/18423.The_Left_Hand_of_Darkness",
        "goodreads_id": "18423",
    },
    {
        "raw_text": "Rendezvous with Rama",
        "title": "Rendezvous with Rama",
        "author": "Arthur C. Clarke",
        "url": "https://www.goodreads.com/book/show/112537.Rendezvous_with_Rama",
        "goodreads_id": "112537",
    },
    {
        "raw_text": "Exhalation",
        "title": "Exhalation: Stories",
        "author": "Ted Chiang",
        "url": "https://www.goodreads.com/book/show/41160292-exhalation",
        "goodreads_id": "41160292",
    },
    {
        "raw_text": "The Three-Body Problem",
        "title": "The Three-Body Problem",
        "author": "Liu Cixin",
        "url": "https://www.goodreads.com/book/show/20518872-the-three-body-problem",
        "goodreads_id": "20518872",
    },
    {
        "raw_text": "The Far Pavilions",
        "title": "The Far Pavilions",
        "author": "M.M. Kaye",
        "url": "https://www.goodreads.com/book/show/10222.The_Far_Pavilions",
        "goodreads_id": "10222",
    },
    {
        "raw_text": "Gora",
        "title": "Gora",
        "author": "Rabindranath Tagore",
        "url": "https://www.goodreads.com/book/show/1268541.Gora",
        "goodreads_id": "1268541",
    },
    {
        "raw_text": "Death Note",
        "title": "Death Note, Vol. 1",
        "author": "Tsugumi Ohba",
        "url": "https://www.goodreads.com/book/show/13615.Death_Note_Vol_1",
        "goodreads_id": "13615",
    },
    {
        "raw_text": "From the corner of his eye",
        "title": "From the Corner of His Eye",
        "author": "Dean Koontz",
        "url": "https://www.goodreads.com/book/show/65948.From_the_Corner_of_His_Eye",
        "goodreads_id": "65948",
    },
    {
        "raw_text": "Ramona Quimby",
        "title": "Ramona Quimby (Series)",
        "author": "Beverly Cleary",
        "url": "https://www.goodreads.com/series/40341-ramona-quimby",
        "goodreads_id": None,
    },
    {
        "raw_text": "A Firefly in the Dark",
        "title": "A Firefly in the Dark",
        "author": "Shashi Deshpande",
        "url": "https://www.goodreads.com/book/show/39793906-a-firefly-in-the-dark",
        "goodreads_id": "39793906",
    },
    {
        "raw_text": "Maya’s New Husband",
        "title": "Maya's New Husband",
        "author": "Rajesh Talwar",
        "url": "https://www.goodreads.com/en/book/show/24284039",
        "goodreads_id": "24284039",
    },
    {
        "raw_text": "Bombay Duck is a Fish",
        "title": "Bombay Duck is a Fish",
        "author": "Priya Ramani",
        "url": "https://www.goodreads.com/en/book/show/11393736",
        "goodreads_id": "11393736",
    },
    {
        "raw_text": "Jinnah Often came to our house",
        "title": "Jinnah Often Came to Our House",
        "author": "Kiran Doshi",
        "url": "https://www.goodreads.com/en/book/show/28673987",
        "goodreads_id": "28673987",
    },
    {
        "raw_text": "All the lives we have never lived by Anuradha Roy",
        "title": "All the Lives We Never Lived",
        "author": "Anuradha Roy",
        "url": "https://www.goodreads.com/book/show/38622116-all-the-lives-we-never-lived",
        "goodreads_id": "38622116",
    },
    {
        "raw_text": "Illicit happiness of other people",
        "title": "The Illicit Happiness of Other People",
        "author": "Manu Joseph",
        "url": "https://www.goodreads.com/book/show/13707645-the-illicit-happiness-of-other-people",
        "goodreads_id": "13707645",
    },
    {
        "raw_text": "Serious Men",
        "title": "Serious Men",
        "author": "Manu Joseph",
        "url": "https://www.goodreads.com/book/show/7628608-serious-men",
        "goodreads_id": "7628608",
    },
    {
        "raw_text": "Jasmine Days",
        "title": "Jasmine Days",
        "author": "Benyamin",
        "url": "https://www.goodreads.com/book/show/22668589-mullappoo-niramulla-pakalukal",
        "goodreads_id": "22668589",
    },
    {
        "raw_text": "Goat Days Benyamin",
        "title": "Goat Days",
        "author": "Benyamin",
        "url": "https://www.goodreads.com/book/show/13627448-goat-days",
        "goodreads_id": "13627448",
    },
    {
        "raw_text": "Ghachar Ghochar",
        "title": "Ghachar Ghochar",
        "author": "Vivek Shanbhag",
        "url": "https://www.goodreads.com/book/show/30267604-ghachar-ghochar",
        "goodreads_id": "30267604",
    },
    {
        "raw_text": "If it’s Monday it must be Madurai",
        "title": "If It’s Monday It Must Be Madurai: A Conducted Tour of India",
        "author": "Srinath Perur",
        "url": "https://www.goodreads.com/book/show/19546759-if-it-s-monday-it-must-be-madurai",
        "goodreads_id": "19546759",
    },
    {
        "raw_text": "The Legend of Khasak",
        "title": "The Legend of Khasak",
        "author": "O.V. Vijayan",
        "url": "https://www.goodreads.com/book/show/2623267-khasakkinte-ithihasam",
        "goodreads_id": "2623267",
    },
    {
        "raw_text": "You beneath your skin",
        "title": "You Beneath Your Skin",
        "author": "Damyanti Biswas",
        "url": "https://www.goodreads.com/en/book/show/47634028",
        "goodreads_id": "47634028",
    },
    {
        "raw_text": "Accidental Magic",
        "title": "Accidental Magic",
        "author": "Keshava Guha",
        "url": "https://www.goodreads.com/book/show/48747212-accidental-magic",
        "goodreads_id": "48747212",
    },
    {
        "raw_text": "Aithihyamala",
        "title": "Aithihyamala",
        "author": "Kottarathil Sankunni",
        "url": "https://www.goodreads.com/book/show/10588971-aithihyamala",
        "goodreads_id": "10588971",
    },
    {
        "raw_text": "The City of Brass",
        "title": "The City of Brass",
        "author": "S.A. Chakraborty",
        "url": "https://www.goodreads.com/book/show/32718027-the-city-of-brass",
        "goodreads_id": "32718027",
    },
    {
        "raw_text": "Stories of Us: The common man(?)",
        "title": "Stories of Us: The Common Man",
        "author": "Kavita Singhal",
        "url": "https://www.goodreads.com/book/show/44026368-stories-of-us",
        "goodreads_id": "44026368",
    },
    {
        "raw_text": "Ecology and Equity",
        "title": "Ecology and Equity: The Use and Abuse of Nature in Contemporary India",
        "author": "Madhav Gadgil & Ramachandra Guha",
        "url": "https://www.goodreads.com/book/show/1397482.Ecology_and_Equity",
        "goodreads_id": "1397482",
    },
    {
        "raw_text": "Inside jokes: Using humour to reverse engineer the mind",
        "title": "Inside Jokes: Using Humor to Reverse-Engineer the Mind",
        "author": "Matthew M. Hurley",
        "url": "https://www.goodreads.com/en/book/show/9834730",
        "goodreads_id": "9834730",
    },
    {
        "raw_text": "House of Leaves",
        "title": "House of Leaves",
        "author": "Mark Z. Danielewski",
        "url": "https://www.goodreads.com/book/show/24800.House_of_Leaves",
        "goodreads_id": "24800",
    },
    {
        "raw_text": "Six of Crows",
        "title": "Six of Crows",
        "author": "Leigh Bardugo",
        "url": "https://www.goodreads.com/book/show/23437156-six-of-crows",
        "goodreads_id": "23437156",
    },
    {
        "raw_text": "Crooked Kingdom",
        "title": "Crooked Kingdom",
        "author": "Leigh Bardugo",
        "url": "https://www.goodreads.com/book/show/22299763-crooked-kingdom",
        "goodreads_id": "22299763",
    },
    {
        "raw_text": "A Fine Balance",
        "title": "A Fine Balance",
        "author": "Rohinton Mistry",
        "url": "https://www.goodreads.com/book/show/5211.A_Fine_Balance",
        "goodreads_id": "5211",
    },
]


def normalize_str(s: str) -> str:
    """Normalize string for lookup."""
    return re.sub(r'[^a-z0-9]', '', s.lower())


def ingest_meetup_25():
    db = SessionLocal()
    try:
        now_str = datetime.utcnow()
        meetup = db.query(Meetup).filter(Meetup.meetup_number == 25).first()
        if not meetup:
            print("ERROR: Meetup #25 record not found in database!")
            return

        print(f"=== INGESTING MEETUP #25 (ID: {meetup.id}) ===")

        # 1. Update Meetup Details
        venue = db.query(Venue).filter(Venue.name.ilike("%art studio%")).first()
        if venue:
            meetup.venue_id = venue.id
            print(f"[OK] Linked Venue: {venue.name} ({venue.id})")

        meetup.title = "BBB Meetup #25: The Seen and Unseen"
        meetup.attendance_count = 13
        meetup.format = "IN_PERSON"
        meetup.description = (
            "Conducted at Aanai Art Studio in Koramangala, generously offered by member Gayathri. "
            "Our 25th milestone meetup (quarter century babyyy!)."
        )
        db.flush()

        # Find Source for BBB Meetup-9.txt
        source = db.query(Source).filter(Source.file_path.ilike("%meetup-9%")).first()
        source_id = source.id if source else meetup.source_id

        added_discussions = 0
        existing_discussions = 0
        new_books_count = 0
        linked_books_count = 0

        for item in MEETUP_25_BOOKS:
            title = item["title"]
            raw_text = item["raw_text"]
            author_name = item["author"]
            gid = item["goodreads_id"]
            url = item["url"]
            norm_title = normalize_str(title)
            norm_raw = normalize_str(raw_text)

            # 2. Author Resolution
            author_id = None
            if author_name:
                norm_auth = normalize_str(author_name)
                author = db.query(Author).filter(
                    (Author.normalized_name == norm_auth) |
                    (Author.full_name.ilike(author_name))
                ).first()
                if not author:
                    author = Author(
                        full_name=author_name,
                        normalized_name=norm_auth
                    )
                    db.add(author)
                    db.flush()
                author_id = author.id

            # 3. Canonical Book Resolution
            book = None
            # Try by Goodreads ID first
            if gid:
                book = db.query(CanonicalBook).filter(CanonicalBook.goodreads_id == gid).first()

            # Try by normalized title or raw title
            if not book:
                book = db.query(CanonicalBook).filter(
                    (CanonicalBook.normalized_title == norm_title) |
                    (CanonicalBook.normalized_title == norm_raw) |
                    (CanonicalBook.title.ilike(title)) |
                    (CanonicalBook.title.ilike(raw_text))
                ).first()

            if not book:
                # Create new canonical book
                book = CanonicalBook(
                    title=title,
                    normalized_title=norm_title,
                    author_id=author_id,
                    goodreads_id=gid,
                    external_url=url,
                    media_type="book",
                )
                db.add(book)
                db.flush()
                new_books_count += 1
            else:
                linked_books_count += 1
                # Update missing fields
                if not book.goodreads_id and gid:
                    book.goodreads_id = gid
                if not book.author_id and author_id:
                    book.author_id = author_id
                if not book.external_url and url:
                    book.external_url = url
                db.flush()

            # 4. ImportedBook provenance
            imp_book = db.query(ImportedBook).filter(
                ImportedBook.canonical_book_id == book.id,
                ImportedBook.source_id == source_id
            ).first()
            if not imp_book and source_id:
                imp_book = ImportedBook(
                    raw_title=raw_text,
                    raw_author=author_name,
                    normalized_title=norm_raw,
                    source_id=source_id,
                    canonical_book_id=book.id,
                )
                db.add(imp_book)
                db.flush()

            # 5. Discussion Record
            disc = db.query(Discussion).filter(
                Discussion.meetup_id == meetup.id,
                Discussion.canonical_book_id == book.id
            ).first()

            if not disc:
                disc = Discussion(
                    meetup_id=meetup.id,
                    canonical_book_id=book.id,
                    topic="Member Discussion",
                    notes=f"Shared at Meetup #25. Goodreads: {url}",
                    confidence_score=1.0,
                    source_id=source_id,
                    external_url=url,
                )
                db.add(disc)
                added_discussions += 1
            else:
                existing_discussions += 1

        db.commit()

        print(f"[OK] Ingestion completed!")
        print(f"  - Total books processed: {len(MEETUP_25_BOOKS)}")
        print(f"  - New canonical books created: {new_books_count}")
        print(f"  - Existing canonical books linked: {linked_books_count}")
        print(f"  - Discussions added: {added_discussions}")
        print(f"  - Existing discussions: {existing_discussions}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to ingest Meetup #25: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    ingest_meetup_25()
