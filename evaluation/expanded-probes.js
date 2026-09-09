// Separate diagnostic for the expanded corpus. Written before generating its
// vectors or measuring these new queries. Does not replace the frozen64 set.
const p=(collection,query,relevant)=>({collection,query,relevant});
export const probes=[
 p('field-notes','Waiting passengers need somewhere to escape a sudden downpour.',['f41']),
 p('field-notes','Help people get across the road in shorter stages.',['f42']),
 p('field-notes','I need a secure covered place for my bike at the office.',['f43']),
 p('field-notes','Public transport would be easier if I never needed to check a schedule.',['f44']),
 p('field-notes','The hard surface outside should let water soak through.',['f45']),
 p('field-notes','How can neighbors share food they will not use?',['f48']),
 p('field-notes','Teach the owner to do the repair while helping them.',['f49']),
 p('field-notes','Tomorrow I will forget where I stopped working.',['f51']),
 p('field-notes','The meeting should end with one agreed choice and somebody responsible.',['f53']),
 p('field-notes','Find out whether the files I copied can actually be recovered.',['f56']),
 p('field-notes','Keep an unedited version of the conversation before removing background noise.',['f57']),
 p('field-notes','Connect backyards so animals can travel between them.',['f59']),
 p('studio-notebook','Let me see which records will be removed before I commit.',['s41']),
 p('studio-notebook','The writing must survive if the internet stops working.',['s44','s43']),
 p('studio-notebook','Buttons are hard to hit accurately with a finger.',['s45']),
 p('studio-notebook','I cannot tell what the unlabeled symbol does.',['s46']),
 p('studio-notebook','Where will the next key press go?',['s47']),
 p('studio-notebook','Return keyboard control to the opener after a popup closes.',['s48']),
 p('studio-notebook','Learn from the first unassisted attempt to use a prototype.',['s50']),
 p('studio-notebook','Do not confuse the research evidence with our explanation for it.',['s51']),
 p('studio-notebook','The new algorithm needs to beat a basic reference on unseen examples.',['s53']),
 p('studio-notebook','A repeated network attempt must not add the same item twice.',['s56']),
 p('studio-notebook','Stop background computation after leaving the screen.',['s57']),
 p('studio-notebook','An empty collection needs an obvious first step.',['s60']),
];
