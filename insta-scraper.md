What can Instagram Post Scraper do?
Our Instagram Post Scraper allows you to scrape data from public Instagram posts beyond what the Instagram API allows. Just add a username, profile URL or post URL, and you're ready to:

📸 Extract Instagram post data at scale from any public profile

📝 Get full post details including captions, mentions, images, tagged users, and engagement metrics (number of likes, comments, replies, video views)

⚡ Scrape posts, carousels, and reels/videos with no limitations on requests

💬 Collect a few latest comments with timestamps and likes

⬇️ Download Instagram posts data in JSON, CSV, Excel, or other formats

🦾 Export posts data via SDKs (Python & Node.js), use API Endpoints & webhooks

🤳 Explore our other social media scrapers

With the Instagram data you’ve scraped, you can monitor the content put out by your favorite creators or your competitors. Other options include seeing what’s trending on the platform through analyzing engagement, posting frequency, or even how well each post type is doing.

What data can I extract with Instagram Post Scraper?
Using this Instagram Post API, you will be able to extract the following data from posts:

🔗 Post URL	👤 Post author	👥 Post coauthor	🚸 Child posts	🗒️ Caption
❤️ Number of likes	🗨️ First and latest comments	🔢 Number of comments	#️⃣ Post hashtags if any	🔖 Tagged users
🎥 Type of post	📅 Date posted	➰ Image URLs	⌨️ Alt text	🖼️ Image dimensions
🆔 Instagram ID	🗨️ Post mentions if any	📽️ Video duration	🔄 Video play count	📹 Video URL
📌 Is it a pinned post?	💰 Is it a sponsored post?	💬 Are comments disabled?	💵 Is it a paid partnership?	🏦 Post owner information
If you need to scrape all comments and replies from each post, try Instagram Comments Scraper. If you want to scrape both posts and comments in one go, try out our Instagram Comments and Posts Export tool, instead. If you only need profile info (number of of followers, bio, etc.), go for Instagram Profile Scraper.

How to extract posts from Instagram profiles?
Instagram Post Scraper is designed with users in mind, even those who have never extracted data from the web before. Using it takes just a few steps.

Create a free Apify account using your email.
Open Instagram Post Scraper.
Add one or more Instagram usernames, profile URLs, or specific post URLs.
Click the “Start” button and wait for the data to be extracted.
Download your data in JSON, XML, CSV, Excel, or HTML.

⬇️ Input
Enter the Instagram username or profile URL that you want to get data on, then enter the number of posts you want returned from the profile. URLs can be entered one by one, or you can use the Bulk edit section to add a prepared list. You can also make sure you only get newer posts by setting a cutoff date.

If you want to scrape specific post URLs, you can do so one by one or bulk edit entries. In that case, you can’t set maximum posts or a date filter.

output example:
[
    {
        "inputUrl": "https://www.instagram.com/p/DLNsnpUTdVS/",
        "id": "3660778310592222546",
        "type": "Image",
        "shortCode": "DLNsnpUTdVS",
        "caption": "Your phone isn’t rotting your brain—but cell death and fungi might. 🧠\n\nWhile doom scrolling has gained a reputation for turning brains into mush, the real process of brain rot happens after we’re gone—and sometimes, not at all. Scientists are uncovering preserved brains that are hundreds or even millennia old, reshaping our understanding of human history. From autolysis to microbial activity, we’re only just learning what happens to our complex organ after death. \n\nFind out more at the link in bio. \n\nPhotograph by Zephyr / Science Photo Library",
        "hashtags": [],
        "mentions": [],
        "url": "https://www.instagram.com/p/DLNsnpUTdVS/",
        "commentsCount": 230,
        "firstComment": "Amen.",
        "latestComments": [
            {
                "id": "18070377008012681",
                "text": "Amen.",
                "ownerUsername": "acostadorego",
                "ownerProfilePicUrl": "https://scontent-dfw5-1.cdninstagram.com/v/t51.2885-19/467616039_1090860458918566_754450314970227118_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby43MjAuYzIifQ&_nc_ht=scontent-dfw5-1.cdninstagram.com&_nc_cat=110&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=tG7FmDYYbwkQ7kNvwE7Z_Eq&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfWAGhkPu_th-V0N_-7CECc4oPUwzea8lw3r0gN-uWsRTw&oe=68B3645C&_nc_sid=10d13b",
                "timestamp": "2025-07-31T05:38:50.000Z",
                "repliesCount": 0,
                "replies": [],
                "likesCount": 0,
                "owner": {
                    "id": "52290062017",
                    "is_verified": false,
                    "profile_pic_url": "https://scontent-dfw5-1.cdninstagram.com/v/t51.2885-19/467616039_1090860458918566_754450314970227118_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby43MjAuYzIifQ&_nc_ht=scontent-dfw5-1.cdninstagram.com&_nc_cat=110&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=tG7FmDYYbwkQ7kNvwE7Z_Eq&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfWAGhkPu_th-V0N_-7CECc4oPUwzea8lw3r0gN-uWsRTw&oe=68B3645C&_nc_sid=10d13b",
                    "username": "acostadorego"
                }
            },
            {
                "id": "17886969522314132",
                "text": "Gabagool? Over here 👇",
                "ownerUsername": "munkingly31",
                "ownerProfilePicUrl": "https://scontent-dfw5-2.cdninstagram.com/v/t51.2885-19/525633012_17966808947940396_1844217093665647377_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-dfw5-2.cdninstagram.com&_nc_cat=100&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=hgCdNv5tX-EQ7kNvwHTMZif&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfWUzlguIstHfqi2wvWWEMoOPFwYtB_DGZQQTIrfQ6a-fw&oe=68B35EA3&_nc_sid=10d13b",
                "timestamp": "2025-07-06T00:32:30.000Z",
                "repliesCount": 0,
                "replies": [],
                "likesCount": 0,
                "owner": {
                    "id": "58286980395",
                    "is_verified": false,
                    "profile_pic_url": "https://scontent-dfw5-2.cdninstagram.com/v/t51.2885-19/525633012_17966808947940396_1844217093665647377_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-dfw5-2.cdninstagram.com&_nc_cat=100&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=hgCdNv5tX-EQ7kNvwHTMZif&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfWUzlguIstHfqi2wvWWEMoOPFwYtB_DGZQQTIrfQ6a-fw&oe=68B35EA3&_nc_sid=10d13b",
                    "username": "munkingly31"
                }
            },
            {
                "id": "17905883067072604",
                "text": "Reading this as i doom scroll",
                "ownerUsername": "thebasicshot_photography",
                "ownerProfilePicUrl": "https://scontent-dfw5-2.cdninstagram.com/v/t51.2885-19/523852946_17910479478189504_8420589592534655334_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-dfw5-2.cdninstagram.com&_nc_cat=100&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=6SyFgM4tsGoQ7kNvwFSulxj&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfU20WQSkt6P-tAeymJUiKSes6XFz9_RBfsXYcfP0c0PfA&oe=68B382B0&_nc_sid=10d13b",
                "timestamp": "2025-07-03T13:23:54.000Z",
                "repliesCount": 0,
                "replies": [],
                "likesCount": 0,
                "owner": {
                    "id": "65668069503",
                    "is_verified": false,
                    "profile_pic_url": "https://scontent-dfw5-2.cdninstagram.com/v/t51.2885-19/523852946_17910479478189504_8420589592534655334_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-dfw5-2.cdninstagram.com&_nc_cat=100&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=6SyFgM4tsGoQ7kNvwFSulxj&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfU20WQSkt6P-tAeymJUiKSes6XFz9_RBfsXYcfP0c0PfA&oe=68B382B0&_nc_sid=10d13b",
                    "username": "thebasicshot_photography"
                }
            },
            {
                "id": "18070000037066551",
                "text": "Yeah wait til you start studying the brains of anyone born after 2005",
                "ownerUsername": "jenniepawlak",
                "ownerProfilePicUrl": "https://scontent-dfw5-1.cdninstagram.com/v/t51.2885-19/66788619_2287457721471467_1919838832144941056_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-dfw5-1.cdninstagram.com&_nc_cat=111&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=4IRcUhJUkKgQ7kNvwHT3-x2&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfWeMHQf2JqwpUfedYqFZnnmurjg2swmWcZ0G_H9wvHl6w&oe=68B37C8C&_nc_sid=10d13b",
                "timestamp": "2025-07-01T13:07:02.000Z",
                "repliesCount": 0,
                "replies": [],
                "likesCount": 0,
                "owner": {
                    "id": "810782332",
                    "is_verified": false,
                    "profile_pic_url": "https://scontent-dfw5-1.cdninstagram.com/v/t51.2885-19/66788619_2287457721471467_1919838832144941056_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-dfw5-1.cdninstagram.com&_nc_cat=111&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=4IRcUhJUkKgQ7kNvwHT3-x2&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfWeMHQf2JqwpUfedYqFZnnmurjg2swmWcZ0G_H9wvHl6w&oe=68B37C8C&_nc_sid=10d13b",
                    "username": "jenniepawlak"
                }
            },
            {
                "id": "17977356989728530",
                "text": "😮",
                "ownerUsername": "bilim.dili",
                "ownerProfilePicUrl": "https://scontent-dfw5-2.cdninstagram.com/v/t51.2885-19/514669428_17844467226518738_8225528109146119497_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-dfw5-2.cdninstagram.com&_nc_cat=102&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=_fpwGG11ZdYQ7kNvwFDl7zd&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfXSmOsXdDJdUsHMW6Rmwl36FqSxL-9r8ZewrF8uvE863Q&oe=68B385A7&_nc_sid=10d13b",
                "timestamp": "2025-06-30T18:48:29.000Z",
                "repliesCount": 0,
                "replies": [],
                "likesCount": 0,
                "owner": {
                    "id": "75495630737",
                    "is_verified": false,
                    "profile_pic_url": "https://scontent-dfw5-2.cdninstagram.com/v/t51.2885-19/514669428_17844467226518738_8225528109146119497_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-dfw5-2.cdninstagram.com&_nc_cat=102&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=_fpwGG11ZdYQ7kNvwFDl7zd&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfXSmOsXdDJdUsHMW6Rmwl36FqSxL-9r8ZewrF8uvE863Q&oe=68B385A7&_nc_sid=10d13b",
                    "username": "bilim.dili"
                }
            },
            {
                "id": "18044270429273329",
                "text": "67",
                "ownerUsername": "82726327.727373829",
                "ownerProfilePicUrl": "https://scontent-dfw5-2.cdninstagram.com/v/t51.2885-19/272960212_224757973203438_2687568953995720901_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDAwLmMyIn0&_nc_ht=scontent-dfw5-2.cdninstagram.com&_nc_cat=106&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=Lkvm6bxTm7gQ7kNvwFV2LJu&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfXIVN4VyI5Z_6Xd4yxwYjsSu4t6HLEutBDv0u_DHY9C0Q&oe=68B38CAC&_nc_sid=10d13b",
                "timestamp": "2025-06-29T19:05:41.000Z",
                "repliesCount": 0,
                "replies": [],
                "likesCount": 0,
                "owner": {
                    "id": "42688402277",
                    "is_verified": false,
                    "profile_pic_url": "https://scontent-dfw5-2.cdninstagram.com/v/t51.2885-19/272960212_224757973203438_2687568953995720901_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDAwLmMyIn0&_nc_ht=scontent-dfw5-2.cdninstagram.com&_nc_cat=106&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=Lkvm6bxTm7gQ7kNvwFV2LJu&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfXIVN4VyI5Z_6Xd4yxwYjsSu4t6HLEutBDv0u_DHY9C0Q&oe=68B38CAC&_nc_sid=10d13b",
                    "username": "82726327.727373829"
                }
            },
            {
                "id": "17933304675051118",
                "text": "Didn't get the memo",
                "ownerUsername": "umar_habibk",
                "ownerProfilePicUrl": "https://scontent-dfw5-2.cdninstagram.com/v/t51.2885-19/438486407_805072481482411_7512672799510925069_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby45NTMuYzIifQ&_nc_ht=scontent-dfw5-2.cdninstagram.com&_nc_cat=107&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=5puaxWzYRtUQ7kNvwFPLOMo&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfVyt8OTO-gshqYSeErcLxxDzBTohG_Djc8PPj2Hwm4OWw&oe=68B38FD8&_nc_sid=10d13b",
                "timestamp": "2025-06-29T10:36:48.000Z",
                "repliesCount": 0,
                "replies": [],
                "likesCount": 0,
                "owner": {
                    "id": "1688870668",
                    "is_verified": false,
                    "profile_pic_url": "https://scontent-dfw5-2.cdninstagram.com/v/t51.2885-19/438486407_805072481482411_7512672799510925069_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby45NTMuYzIifQ&_nc_ht=scontent-dfw5-2.cdninstagram.com&_nc_cat=107&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=5puaxWzYRtUQ7kNvwFPLOMo&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfVyt8OTO-gshqYSeErcLxxDzBTohG_Djc8PPj2Hwm4OWw&oe=68B38FD8&_nc_sid=10d13b",
                    "username": "umar_habibk"
                }
            },
            {
                "id": "18076376074898547",
                "text": "Faye magpantay",
                "ownerUsername": "seanjulian__",
                "ownerProfilePicUrl": "https://scontent-dfw5-3.cdninstagram.com/v/t51.2885-19/498032889_18361188925178960_6996879012883085886_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby42MzYuYzIifQ&_nc_ht=scontent-dfw5-3.cdninstagram.com&_nc_cat=108&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=5GffaS5SqUkQ7kNvwEE8AEm&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfWCHdCk3E_EpjKk1wZwy_Nt5jOLsyeMjfaXDTKv6OfAOA&oe=68B38BB0&_nc_sid=10d13b",
                "timestamp": "2025-06-29T10:12:53.000Z",
                "repliesCount": 0,
                "replies": [],
                "likesCount": 0,
                "owner": {
                    "id": "5335682959",
                    "is_verified": false,
                    "profile_pic_url": "https://scontent-dfw5-3.cdninstagram.com/v/t51.2885-19/498032889_18361188925178960_6996879012883085886_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby42MzYuYzIifQ&_nc_ht=scontent-dfw5-3.cdninstagram.com&_nc_cat=108&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=5GffaS5SqUkQ7kNvwEE8AEm&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfWCHdCk3E_EpjKk1wZwy_Nt5jOLsyeMjfaXDTKv6OfAOA&oe=68B38BB0&_nc_sid=10d13b",
                    "username": "seanjulian__"
                }
            },
            {
                "id": "18179468584324013",
                "text": "Thank you",
                "ownerUsername": "laksmiwulandarr",
                "ownerProfilePicUrl": "https://scontent-dfw5-2.cdninstagram.com/v/t51.2885-19/537352462_18520719781062702_8152576155671636514_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby43MzYuYzIifQ&_nc_ht=scontent-dfw5-2.cdninstagram.com&_nc_cat=106&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=EVokQHQmK5AQ7kNvwEvH1AN&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfVoAEyZ7G4kBIa2qAMrXzDY3fRSlZLZWdSKg0M18Md7uQ&oe=68B36B6B&_nc_sid=10d13b",
                "timestamp": "2025-06-29T07:28:53.000Z",
                "repliesCount": 0,
                "replies": [],
                "likesCount": 0,
                "owner": {
                    "id": "248190701",
                    "is_verified": false,
                    "profile_pic_url": "https://scontent-dfw5-2.cdninstagram.com/v/t51.2885-19/537352462_18520719781062702_8152576155671636514_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby43MzYuYzIifQ&_nc_ht=scontent-dfw5-2.cdninstagram.com&_nc_cat=106&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=EVokQHQmK5AQ7kNvwEvH1AN&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfVoAEyZ7G4kBIa2qAMrXzDY3fRSlZLZWdSKg0M18Md7uQ&oe=68B36B6B&_nc_sid=10d13b",
                    "username": "laksmiwulandarr"
                }
            }
        ],
        "dimensionsHeight": 1350,
        "dimensionsWidth": 1080,
        "displayUrl": "https://scontent-dfw5-3.cdninstagram.com/v/t51.2885-15/503496381_18580771480019133_8965251613058937386_n.jpg?stp=dst-jpg_e15_fr_p1080x1080_tt6&_nc_ht=scontent-dfw5-3.cdninstagram.com&_nc_cat=109&_nc_oc=Q6cZ2QHp3Yyo3-bwIZeWVtJPH2l7F5ag-SBgZqNJiGrR_VBQo8ABR6wq_mOda7IwY56zIpw&_nc_ohc=sY4t_GLOlXwQ7kNvwFWmAbW&_nc_gid=3V_cazReo0SLOXf_DQkoSA&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfXICk-b_6o-bwDVByA6obms1_S13QRNz1XB9R5exTNy0w&oe=68B3745F&_nc_sid=10d13b",
        "images": [],
        "alt": "Photo by National Geographic on June 22, 2025. May be an image of ‎xray and ‎text that says '‎The real science of brain rot ششد‎'‎‎.",
        "likesCount": 73473,
        "timestamp": "2025-06-22T19:00:10.000Z",
        "childPosts": [],
        "ownerFullName": "National Geographic",
        "ownerUsername": "natgeo",
        "ownerId": "787132",
        "isCommentsDisabled": false
    },
    {
        "inputUrl": "https://www.instagram.com/natgeo",
        "id": "3706348645359165044",
        "type": "Video",
        "shortCode": "DNvmHS0Yh50",
        "caption": "With the last two northern white rhinoceroses both being female, a team of scientists must do what's never been done before in order to save the species—create the world’s first surrogate rhino pregnancy.\n\n#TheLastRhinosANewHope premieres tonight at 8/7c on National Geographic. Stream next day on @DisneyPlus and @hulu.",
        "hashtags": ["TheLastRhinosANewHope"],
        "mentions": ["DisneyPlus", "hulu."],
        "url": "https://www.instagram.com/p/DNvmHS0Yh50/",
        "commentsCount": 187,
        "firstComment": "💯❤️",
        "latestComments": [
            {
                "id": "18071961689089030",
                "text": "💯❤️",
                "ownerUsername": "namikgooksun",
                "ownerProfilePicUrl": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/536907981_17842106169564820_3827527501403036994_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby43MzYuYzIifQ&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=104&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=y2wZBo8KFYoQ7kNvwEIGpAX&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfXtIqSjq_B_zSi2tZfIV0h3p0YqZraImUA9h582ozeupw&oe=68B35C61&_nc_sid=10d13b",
                "timestamp": "2025-08-26T10:30:45.000Z",
                "repliesCount": 0,
                "replies": [],
                "likesCount": 0,
                "owner": {
                    "id": "76802764819",
                    "is_verified": false,
                    "profile_pic_url": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/536907981_17842106169564820_3827527501403036994_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby43MzYuYzIifQ&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=104&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=y2wZBo8KFYoQ7kNvwEIGpAX&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfXtIqSjq_B_zSi2tZfIV0h3p0YqZraImUA9h582ozeupw&oe=68B35C61&_nc_sid=10d13b",
                    "username": "namikgooksun"
                }
            },
            {
                "id": "18017240414767632",
                "text": "🙏🏻🤞🏻",
                "ownerUsername": "lydiarees1948",
                "ownerProfilePicUrl": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/12599093_1516946128610919_89283167_a.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=103&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=MphZGOmyPpMQ7kNvwH8FvKE&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfVmiMRChIoEkpkqW-UMM2iLdQ-sQmzUL7hzd3pp_QZQpQ&oe=68B36C53&_nc_sid=10d13b",
                "timestamp": "2025-08-26T09:21:18.000Z",
                "repliesCount": 0,
                "replies": [],
                "likesCount": 0,
                "owner": {
                    "id": "2582099322",
                    "is_verified": false,
                    "profile_pic_url": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/12599093_1516946128610919_89283167_a.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=103&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=MphZGOmyPpMQ7kNvwH8FvKE&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfVmiMRChIoEkpkqW-UMM2iLdQ-sQmzUL7hzd3pp_QZQpQ&oe=68B36C53&_nc_sid=10d13b",
                    "username": "lydiarees1948"
                }
            },
            {
                "id": "18036502172468942",
                "text": "🙏🙏🙏🙏",
                "ownerUsername": "biserka.zerjav",
                "ownerProfilePicUrl": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/532945432_18197707789312062_7386821205547273682_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=106&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=f59iZRNWePsQ7kNvwGw3oLy&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfV23_bX_eMnu4NS_fqv1ZMVli5wEEEt68V_MxUtvU1ghw&oe=68B36D0A&_nc_sid=10d13b",
                "timestamp": "2025-08-26T08:45:26.000Z",
                "repliesCount": 0,
                "replies": [],
                "likesCount": 0,
                "owner": {
                    "id": "9547784061",
                    "is_verified": false,
                    "profile_pic_url": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/532945432_18197707789312062_7386821205547273682_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=106&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=f59iZRNWePsQ7kNvwGw3oLy&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfV23_bX_eMnu4NS_fqv1ZMVli5wEEEt68V_MxUtvU1ghw&oe=68B36D0A&_nc_sid=10d13b",
                    "username": "biserka.zerjav"
                }
            },
            {
                "id": "17890754571316065",
                "text": "😮",
                "ownerUsername": "sakariye5179",
                "ownerProfilePicUrl": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/296630877_637699920688985_540441898913849459_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby41OTkuYzIifQ&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=105&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=btOpKUGzlbsQ7kNvwHW97_k&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfUXwdkgYdxxYzFM0GH-c_Kct3se_i_UjQxqEitlCk2Mvg&oe=68B370B0&_nc_sid=10d13b",
                "timestamp": "2025-08-26T08:39:12.000Z",
                "repliesCount": 0,
                "replies": [],
                "likesCount": 0,
                "owner": {
                    "id": "54738859976",
                    "is_verified": false,
                    "profile_pic_url": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/296630877_637699920688985_540441898913849459_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby41OTkuYzIifQ&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=105&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=btOpKUGzlbsQ7kNvwHW97_k&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfUXwdkgYdxxYzFM0GH-c_Kct3se_i_UjQxqEitlCk2Mvg&oe=68B370B0&_nc_sid=10d13b",
                    "username": "sakariye5179"
                }
            }
        ],
        "dimensionsHeight": 1920,
        "dimensionsWidth": 1080,
        "displayUrl": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-15/537993363_18528651631043047_5153543471079933134_n.jpg?stp=dst-jpg_e15_fr_p1080x1080_tt6&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=107&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=Xo0SVNLYwUIQ7kNvwEOHi5d&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfW0NLH7tSSNvFlpSI73xBv3aOKXKM6K8AnCgH7dDi8SOQ&oe=68B366D0&_nc_sid=10d13b",
        "images": [],
        "videoUrl": "https://scontent-den2-1.cdninstagram.com/o1/v/t16/f2/m86/AQN0ViQjKZi2nGAEuCDAkLUcFhxxVAOXqzSi3_mlWlIZS_u7ZX9lrsVeVCv3Cr5vKivscKljtS1J2025nzMYTEtMx0kBc2gQkQg8tZw.mp4?stp=dst-mp4&efg=eyJxZV9ncm91cHMiOiJbXCJpZ193ZWJfZGVsaXZlcnlfdnRzX290ZlwiXSIsInZlbmNvZGVfdGFnIjoidnRzX3ZvZF91cmxnZW4uY2xpcHMuYzIuNzIwLmJhc2VsaW5lIn0&_nc_cat=107&vs=4177947115783995_1237836965&_nc_vs=HBksFQIYUmlnX3hwdl9yZWVsc19wZXJtYW5lbnRfc3JfcHJvZC84QzRFREY5NzI1NzJDNzI0MTRGRkIzNkQ5RjA2MkFBMl92aWRlb19kYXNoaW5pdC5tcDQVAALIARIAFQIYOnBhc3N0aHJvdWdoX2V2ZXJzdG9yZS9HR3N1X2g4UEdYUFRQUGtFQUgwdFRGV2NWR2NnYnFfRUFBQUYVAgLIARIAKAAYABsAFQAAJtrbys2tndY%2FFQIoAkMzLBdAPgdsi0OVgRgSZGFzaF9iYXNlbGluZV8xX3YxEQB1%2Fgdl5p0BAA%3D%3D&_nc_rid=b82fa5f0cf&ccb=9-4&oh=00_AfUmHu-Witw-rok_tjHmnphrtxs_otzAq9JZRuSh8FK_zg&oe=68AF839B&_nc_sid=10d13b",
        "alt": null,
        "likesCount": 44193,
        "videoViewCount": 528654,
        "videoPlayCount": 2412253,
        "timestamp": "2025-08-24T16:00:37.000Z",
        "childPosts": [],
        "ownerFullName": "National Geographic TV",
        "ownerUsername": "natgeotv",
        "ownerId": "18091046",
        "productType": "clips",
        "videoDuration": 30.037,
        "taggedUsers": [
            {
                "full_name": "National Geographic",
                "id": "787132",
                "is_verified": true,
                "profile_pic_url": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/495970936_18571729156019133_4702419124763180758_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby40MDAuYzIifQ&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=1&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=iktY_PLLG0sQ7kNvwEbLtCI&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfUcSYovCiVhEz2CclDbpRNkRw8iPKhUzau8Fbc6h9YXKA&oe=68B3735A&_nc_sid=10d13b",
                "username": "natgeo"
            },
            {
                "full_name": "National Geographic Animals",
                "id": "1029649300",
                "is_verified": true,
                "profile_pic_url": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/463187306_524336350450214_2612040103022994586_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=1&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=omrGxGLlZioQ7kNvwHVLVYB&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfW-QTQpZir_DiCtZE7RtyeQdM-Hvn5-ulgNvLA6SAMBxg&oe=68B38A8E&_nc_sid=10d13b",
                "username": "natgeoanimals"
            },
            {
                "full_name": "Ami Vitale",
                "id": "492356095",
                "is_verified": true,
                "profile_pic_url": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/58716096_2352894834998677_789573481887956992_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=101&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=v_UaFlFc2KUQ7kNvwFVVjmr&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfUnlAmwiUP3UzzbLTscKdDLiWZpnm7IA_jDtuiAp8QJWQ&oe=68B36641&_nc_sid=10d13b",
                "username": "amivitale"
            }
        ],
        "musicInfo": {
            "artist_name": "animalworld20255",
            "song_name": "Original audio",
            "uses_original_audio": true,
            "should_mute_audio": false,
            "should_mute_audio_reason": "",
            "audio_id": "800032749373234"
        },
        "coauthorProducers": [
            {
                "id": "492356095",
                "is_verified": true,
                "profile_pic_url": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/58716096_2352894834998677_789573481887956992_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=101&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=v_UaFlFc2KUQ7kNvwFVVjmr&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfUnlAmwiUP3UzzbLTscKdDLiWZpnm7IA_jDtuiAp8QJWQ&oe=68B36641&_nc_sid=10d13b",
                "username": "amivitale"
            },
            {
                "id": "1029649300",
                "is_verified": true,
                "profile_pic_url": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/463187306_524336350450214_2612040103022994586_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=1&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=omrGxGLlZioQ7kNvwHVLVYB&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfW-QTQpZir_DiCtZE7RtyeQdM-Hvn5-ulgNvLA6SAMBxg&oe=68B38A8E&_nc_sid=10d13b",
                "username": "natgeoanimals"
            },
            {
                "id": "787132",
                "is_verified": true,
                "profile_pic_url": "https://scontent-den2-1.cdninstagram.com/v/t51.2885-19/495970936_18571729156019133_4702419124763180758_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby40MDAuYzIifQ&_nc_ht=scontent-den2-1.cdninstagram.com&_nc_cat=1&_nc_oc=Q6cZ2QHWnL-F-Coqh9Mc0_n0v8jiZ0zaQpKeGV6DPUKz5_KBld5VyUz8FOPySniertWxJSk&_nc_ohc=iktY_PLLG0sQ7kNvwEbLtCI&_nc_gid=FaVhlJqUIv_7JUSykDzmYw&edm=APs17CUBAAAA&ccb=7-5&oh=00_AfUcSYovCiVhEz2CclDbpRNkRw8iPKhUzau8Fbc6h9YXKA&oe=68B3735A&_nc_sid=10d13b",
                "username": "natgeo"
            }
        ],
        "isCommentsDisabled": false
    }
]

❓FAQ
Can Instagram Post Scraper extract the number of reposts?
Reposts metric has been added to the Instagram app only recently, in summer 2025. It is not a part of Instagram Posts Scraper's datasets yet; our team is working to make that happen.

Can Instagram Post Scraper extract reels?
Yes, Instagram Post Scraper can extract reels. If you only want to extract reels, we recommend using Instagram Reel Scraper instead for efficiency. That Actor also extracts the number of shares of each reel.

Can this API scrape posts from private Instagram accounts?
No, it cannot. Only public accounts can be scraped. If you try, your dataset will only contain “undefined” entries.

Why is the likesCount value showing as -1 for some posts?
When a user has hidden the like count on their post, Instagram doesn’t display this data publicly. In those cases, the scraper returns -1 for likesCount which indicates that the information isn’t available.

What is a “sidecar” media type in Instagram posts data?
Sidecar is another word for an image carousel — when multiple images are posted as a single post.

Is there a way to extract only new posts from an Instagram profile?
Yes. You can use the Date filter parameter (onlyPostsNewerThan) to set the timeframe for the posts you wish to scrape. The date can be specified in two ways:

Relative format: 1 day, 2 months, 3 years (ago)
Absolute format: YYYY-MM-DD or full ISO format
All time values will be interpreted in UTC timezone.

Can I skip pinned posts when scraping Instagram posts?
Yes. You can choose whether to include or exclude pinned posts when scraping. Since pinned posts can sometimes be very old (and not relevant to your scrape), skipping them just makes sense sometimes. However, this option is only available in the JSON input, not in the user-facing UI. You can control it by setting it to trueor false. For more details, check the Input tab of the Actor.

Can I exclude pinned posts even if they are within the date range?
That’s not possible to filter out before scraping. The scraper will always include pinned posts if they match your Date filter settings. If you want to exclude them, you’ll need to filter the output data after the run by checking for isPinned: true and removing those items.

Is there any way to scrape only new posts (including pinned ones) while filtering out older pinned posts?
Yes, there is. You can combine the Date filter with Pinned posts parameter in JSON input. If you want to see posts newer than a certain date (using the Date filter onlyPostsNewerThan) and also include Pinned posts only if they meet that condition, set:

"skipPinnedPosts": true,
"onlyPostsNewerThan": "1 day"

With this setup:

Pinned posts that are newer than the time restriction will still be included.
Older pinned posts will be skipped.
This way you’ll get the result you want: “Scrape pinned posts only if they fit the date restriction”.

Can I use integrations with Instagram Post Scraper?
You can integrate post data scraped from Instagram with almost any cloud service or web app. We offer integrations with Zapier, n8n, Slack, Make, Airbyte, Gumloop, CrewAI, Lindy, GitHub, Google Sheets, Google Drive, and plenty more.

Alternatively, you could use webhooks to carry out an action whenever an event occurs, such as getting a notification whenever Instagram Post Scraper successfully finishes a run.

Can I use Instagram Post Scraper as its an API?
Yes. The Apify API gives you programmatic access to the Apify platform. The API is organized around RESTful HTTP endpoints that enable you to manage, schedule, and run Apify Actors. The API also lets you access any datasets, monitor actor performance, fetch results, create and update versions, and more.

To access the API using Node.js, use the apify-client NPM package. To access the API using Python, use the apify-client PyPI package.

Click on the API tab for code examples, or check out the Apify API reference docs for all the details.

Can I scrape Instagram posts through an MCP Server?
With Apify API, you can use almost any Actor in conjunction with an MCP server. You can connect to the MCP server using clients like ClaudeDesktop and LibreChat, or even build your own. Read all about how you can set up Apify Actors with MCP.

For Instagram Post Scraper, go to the MCP tab and then go through the following steps:

Start a Server-Sent Events (SSE) session to receive a sessionId
Send API messages using that sessionId to trigger the scraper
The message starts the Instagram Post Scraper with the provided input
The response should be: Accepted
Is it legal to scrape Instagram posts?
Our scrapers do not extract any private user data, such as email addresses, gender, or location. They only extract what the user has chosen to share publicly.

However, you should be aware that your results could contain personal data. Personal data is protected by the GDPR in the European Union and by other regulations around the world. You should not scrape personal data unless you have a legitimate reason to do so. If you're unsure whether your reason is legitimate, consult your lawyers. You can also read our blog post on the legality of web scraping.

Instagram Post Scraper not working
We’re always working on improving the performance of our Actors. If you have any technical feedback for Instagram Post Scraper or found a bug, please create an issue in the Issues tab