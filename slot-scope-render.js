_c('div',
{
    attrs:{"id": "app"}
},
[
    _c('app-layout',
    {
        attrs:{"items":items},
        scopedSlots: _u([
            {
                key:"default", 
                fn: function(list){
                    return [_c('div',[_v(_s(list.data))])]
                }
            }
        ])
    })
], 1)