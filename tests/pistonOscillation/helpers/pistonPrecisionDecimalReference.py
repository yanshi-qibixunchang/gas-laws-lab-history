"""Independent 80-decimal arithmetic oracle; no application code is imported."""
import json
import sys
from decimal import Decimal as D, getcontext, ROUND_HALF_EVEN

getcontext().prec = 80
PI = D('3.141592653589793238462643383279502884197169399375105820974944592307816406286208998628')


def sig(x, digits):
    if not x:
        return D(0)
    return x.quantize(D(1).scaleb(x.adjusted() - digits + 1), rounding=ROUND_HALF_EVEN)


def calc(case, rounded):
    k = {key: D(str(value)) for key, value in case['knowns'].items()}
    p = {key: D(str(value)) for key, value in case['profile'].items() if key != 'version'}
    plan = case['plan']
    def r(key, value):
        return sig(value, plan['digits'][key]) if rounded else value
    rows = []
    for o in case['observations']:
        t = D(str(o['deltaMs'])) / 1000 / D(str(o['periodCount'])) if 'deltaMs' in o else D(str(o['periodS']))
        spec = plan['periods'][str(o['runIndex'])]
        if rounded:
            t = sig(t, spec['period'])
        x = sig(t*t, spec['squared']) if rounded else t*t
        rows.append(dict(x=x, y=D(str(o['heightM'])), periodS=t,
                         q=D(str(o['periodCount'])), f=D(str(o['sampleRateHz']))))
    n = len(rows)
    mx = sum(z['x'] for z in rows)/n
    my = sum(z['y'] for z in rows)/n
    exact_a = sum((z['x']-mx)*(z['y']-my) for z in rows)/sum((z['x']-mx)**2 for z in rows)
    a = r('slope', exact_a)
    b = r('intercept', my-exact_a*mx)
    mx, my = r('meanX', mx), r('meanY', my)
    sxx = r('sxx', sum((z['x']-mx)**2 for z in rows))
    for z in rows:
        z['residual'] = r('residualRow', z['y']-(a*z['x']+b))
        z['timeU'] = r('timeU', 1/(z['f']*z['q']*D(6).sqrt()))
        z['heightSensitivity'] = r('heightSensitivity', (z['x']-mx)/sxx)
        z['periodSensitivity'] = r('periodSensitivity', 2*z['periodS']*((z['y']-my)-2*a*(z['x']-mx))/sxx)
    q = r('q', sum(z['residual']**2 for z in rows))
    if q < D('1e-29'):
        q = D(0)
    area = r('area', PI*k['cylinderDiameterM']**2/4)
    gamma = r('gamma', 4*PI**2*k['movingMassKg']*a/(area*k['pressurePa']))
    v = {'meanX': mx, 'sxx': sxx}
    v['residual'] = r('residual', (q/(n-2)).sqrt())
    v['slopeA'] = r('slopeA', v['residual']/sxx.sqrt())
    v['gammaA'] = r('gammaA', abs(gamma/a)*v['slopeA'])
    for key, limit, denom in [('mass', 'massLimitKg', 3), ('diameter', 'diameterLimitM', 3),
                              ('heightScale', 'heightScaleLimit', 3),
                              ('timeScale', 'timeScaleLimit', 3), ('heightReadout', 'heightStepM', 12)]:
        v[key] = r(key, p[limit]/D(denom).sqrt())
    v['pressure'] = p['pressureStandardPa']
    v['slopeReadout'] = r('slopeReadout', sum((z['heightSensitivity']*v['heightReadout'])**2+(z['periodSensitivity']*z['timeU'])**2 for z in rows).sqrt())
    v['slopeSupplement'] = r('slopeSupplement', max(D(0), v['slopeReadout']**2-v['slopeA']**2).sqrt())
    v['slopeB'] = r('slopeB', ((a*v['heightScale'])**2+(2*a*v['timeScale'])**2+v['slopeSupplement']**2).sqrt())
    v['gammaB'] = r('gammaB', abs(gamma)*((v['slopeB']/a)**2+(v['mass']/k['movingMassKg'])**2+(2*v['diameter']/k['cylinderDiameterM'])**2+(v['pressure']/k['pressurePa'])**2).sqrt())
    v['combined'] = r('combined', (v['gammaA']**2+v['gammaB']**2).sqrt())
    v['relative'] = sig(100*v['combined']/abs(gamma), 3)
    v['reportCombined'] = sig(v['combined'], 2)
    power = v['reportCombined'].adjusted()-1
    v['result'] = gamma.quantize(D(1).scaleb(power), rounding=ROUND_HALF_EVEN)
    return dict(values=v, gamma=gamma, area=area, slope=a, intercept=b, q=q, sxx=sxx,
                meanX=mx, meanY=my, relativeError=sig(100*abs(gamma-k['referenceGamma'])/k['referenceGamma'], 3), rows=rows)


print(json.dumps([{'reference': calc(case, False), 'rounded': calc(case, True)} for case in json.load(sys.stdin)], default=str))
