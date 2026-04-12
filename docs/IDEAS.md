Image should be chosen by ai in pipeline by using the alt texts.
The main content should be seperated from the junk like random urls from the navbar and other pictures.
The summary should be rendered in markdown as well.

Tags, Topics and spaces need to be fetched and referenced in the entry
LATER: we need to strengthen and monitor and test the topics and tags creation and spaces suggestion. this should be relative to the ressource type

We need to differentiate different ressource formats. We wil have file formats and url where we need to look at the type (image, video, pdf, doc, whatever file format exists and if file then save it). THen for images for example we later will have a different pipeline to sort them into an album like pinterest where the color, motive, alt text meta etc whatever there is of the image is analyze and saved for better semantic search and then feeds like a specific color palette. for videos similar data saving but more focused on categories and so on.
Then there will be text. first type of text is like when i select a text and can share it then it should look at the text and everything we can get with the share and save it as a quote or somthing similar. we will build different components for similar cases and let the ai chosse what fits best. and the types need to be saved. maybe it is a passage or an explanation of somthing.
The last one will be later notes with checkboxes and todoes. there we need to be able to brainstorm or have bigger ideas.

Add an indicator like glowing borders for not reviewed cards.

Have spaces and be able to create spaces by tags or choose memories to put into. Have subspaces if wanted.

PROMPT NEXT:
Ok lets plan to strengthen the ai pipeline more. i want first of all to have a file with all the prompts we use so i can easily see and change them accordingly. then i want to have some more steps. my question would be: shouldnt i use the generateObject and use our zod schemas for the contracts so we have better formatating?

My plan is to add 2 steps to the pipeline. first would be noiceremover, where i let the ai remove all the links and navigation and stuff we dont need from the generated markdown. rn i have ugly profile pictures and alt texts and navigation in my content. so i need a original content field in the table and then a readable_content field with the removed noice. it still should be the markdown but just without noice. like the medium article looks nice but above and below is so much junk.

The other step would be getting a cover image. idk how to do that exactly but i thought about letting the ai go through the alt texts and choose the most important one. if there allready is a cover page for the ressource take that.

This wil be the url path and only markdown for now. After that we will have other types and differentiate between image, audio, doc file (pdf,docs etc), video, other files... The url and file type will be the most complex because there are many possiblities.

Then there will be text. first type of text is like when i select a text and can share it then it should look at the text and everything we can get with the share and save it as a quote or somthing similar. we will build different components for similar cases and let the ai chosse what fits best. and the types need to be saved. maybe it is a passage or an explanation of somthing.
The last one will be later notes with checkboxes and todoes. there we need to be able to brainstorm or have bigger ideas.

---

@docs/tickets/\_SUPERSEDED-T-002-summarize-generate-object.md:1-143 create a ticket with this structure:

We want to create a strucutre in the ai module that will incorporate the 3 types of ingestion. file like image, text like notes or quotes, url that can be either markdown or file(handle like file then).
if text shared it should look if short or long or something else so we can look if it is a paragraph or a quote or whatever. if it is a note we have written in the apps editor ( iw ill add this editor later) we will have to differntiate if it is a recipe for example or a shoppinglist. lets talk how we could do that.

Then for image i want it to be like a pinterest pin. i want to save descriptions and vectorize and color and motive etc so we can cluster them better and add tags and topics etc. then i can filter by color or whatever.

This needs to be a ticket were we write a palceholder structure that we can build in the next step
