_c('div',
{ attrs:
    { 
        "id": "app"
    }
}, [
    _c('app-layout',
    [
        _c('div',
        [
            _v("另一个主要段落。")
        ]), _v(" "), _c('p',
        {
            attrs:
            {
                "slot": "footer"
            },
            slot: "footer"
        },
        [_v("这里有一些联系信息")])
    ])
],1)